/**
 * Scene 6 — The Trench Run. The climax, and the longest scene in the film.
 *
 * Two sets, toggled on a cut:
 *
 *   0.0 – 41.0  THE TRENCH. A 240-unit trench section, cloned five times and
 *               re-seated ahead of the fighters every frame as a pure function
 *               of t, so the run never ends and nothing is integrated. The
 *               three X-wings, the TIEs, the turbolaser towers, the cockpit
 *               interior and the exhaust port all live here.
 *   41.0 – 54.0 SPACE. The whole battle station, a spreading web of cracks, and
 *               then five thousand bricks.
 *
 * Everything downstream of the odometer hangs off one function: `odo(t)` is the
 * distance the squadron has flown by scene time t, integrated once at build
 * time from a speed profile. Ship positions, section placement, bolt origins
 * and the camera are all expressed against it.
 *
 * Narration:
 *    1.20 –  4.80 RED LEADER "Cut the chatter, Red Squadron. Lock S-foils in
 *                             attack position."
 *    5.30 –  9.85 "They dropped into the trench with the walls a grey blur on
 *                  either side."
 *   12.45 – 18.22 "Behind them came the black fighter and its two escorts, and
 *                  one by one the rebels fell."
 *   18.62 – 21.11 VADER "The Force is strong with this one."
 *   22.30 – 28.60 "At the last moment the boy switched off his targeting
 *                  computer, closed his eyes, and listened."
 *   28.90 – 31.93 OBI-WAN "Let go, Luke. Trust yourself."
 *   33.43 – 38.73 "Two torpedoes went down the shaft. The station lit up from
 *                  the inside..."
 *   40.13 – 43.45 "and came apart into ten thousand pieces."
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bricks, PLATE } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import {
  Starfield,
  BoltPool,
  BrickBurst,
  Sparks,
  Fireball,
  glowSprite,
  additiveMaterial,
} from '../engine/fx.js';
import { svgTexture } from '../engine/svg.js';
import { hash11 } from '../engine/rng.js';
import * as ease from '../engine/ease.js';
import * as fighters from '../kit/ships-fighters.js';

export const meta = { id: 'trench', title: 'The Trench', duration: 54, letterbox: 0.105 };

// ---------------------------------------------------------------------------
// Timeline. Every cut is pinned to a narration line, not to the scene length.
// ---------------------------------------------------------------------------

const T = {
  FOIL_A: 1.55, // S-foils start to crack open
  FOIL_B: 3.5, // ...and are locked
  DIVE: 5.0, // bank over the lip
  IN: 6.5, // down in the trench
  TIES: 13.0, // the pursuit drops in behind
  KILL: 17.35, // a wingman takes a hit
  VADER: 18.6, // over Vader's shoulder
  WIDE: 21.2, // wide of the trench
  COCKPIT: 22.4, // pilot's eyeline, HUD swings in
  FACE: 25.2, // ...cut round to his face, scope over his eye
  HUD_OFF: 26.2, // ...and it swings away, switched off
  BEN: 28.85, // the Obi-Wan line
  OUT: 31.9, // back outside, gliding
  FIRE: 33.6, // torpedoes away
  LOCK: 35.2, // cut ahead of the port to watch them arrive
  DROP: 35.7, // they reach the port
  PULLUP: 37.9, // and the X-wing climbs out
  SPACE: 41.0, // cut to the wide of the station
  CRACK: 42.0, // light starts racing across the hull
  HUSH: 44.2, // a beat of nothing
  BOOM: 44.6, // detonation
  SETTLE: 49.5, // the cloud starts to drift rather than fly
};

// Trench geometry, in world units. One stud is one unit; heights passed to
// Bricks are in plates, so anything vertical gets divided by PLATE.
const HALF_W = 23; // half the width of the trench floor
const WALL_H = 34; // floor to rim
const SECTION = 240; // length of one tileable section
const SECTIONS = 5; // how many are alive at once
const FLY_Y = 15; // the fighters' cruising height inside the trench
const SURFACE_Y = 60; // ...and their height before they drop in

const RED = KIT.laserRed;
const GREEN = KIT.laserGreen;
const STATION_R = 150;
// Fixed for the shots taken from inside the Advanced, because the canopy frame
// is parented to the lens and only lines up with the frame edge at one angle.
const VADER_FOV = 26;

export async function build(ctx) {
  const D = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, ctx.aspect, 0.3, 6000);
  scene.background = new THREE.Color(0x05070c);

  const rigs = {
    trench: standardLights(scene, 'trench', { shadows: false, intensity: 1.0 }),
    space: standardLights(scene, 'space', { shadows: false, intensity: 1.0 }),
  };
  // Vacuum has no bounce: trimming the fill gives the station a real terminator
  // and lets the explosion be the only thing lighting the far side.
  rigs.space.key.intensity = 2.5;
  // Raking in from screen right and slightly behind the lens, so the terminator
  // falls across the visible disc instead of leaving it flat.
  rigs.space.key.position.set(0.72, 0.36, 0.42).multiplyScalar(600);
  rigs.space.hemi.intensity = 0.1;
  rigs.space.fill.intensity = 0.07;
  rigs.space.rim.intensity = 0.45;
  rigs.space.ambient.intensity = 0.035;

  // ------------------------------------------------------------- the odometer
  const odo = makeOdometer(
    [
      [0, 118],
      [T.DIVE, 132],
      [T.IN, 172],
      [T.TIES, 182],
      [T.WIDE, 158],
      [T.COCKPIT + 1.4, 124],
      [T.BEN, 120],
      [T.FIRE, 148],
      [T.PULLUP, 168],
      [T.SPACE, 196],
    ],
    D
  );
  /** Height of the lead fighter above the trench floor. */
  const flyY = (t) =>
    ease.track(
      [
        [0, SURFACE_Y],
        [T.DIVE, SURFACE_Y - 4],
        [T.IN, FLY_Y],
        [T.PULLUP, FLY_Y - 1.5],
        [T.PULLUP + 2.2, WALL_H + 46],
        [T.SPACE, WALL_H + 150],
      ],
      t,
      ease.inOutCubic
    );

  // The port sits far enough ahead of the launch point that the torpedoes have
  // a visible run at it.
  const PORT_Z = odo(T.FIRE) + 452;

  const trench = await buildTrench(ctx, { odo, flyY, portZ: PORT_Z });
  scene.add(trench.group);

  const space = await buildSpace();
  scene.add(space.group);

  // --- full-frame additive plate for the cuts and, later, the detonation
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(80, 46), additiveMaterial(0xffffff, { opacity: 0 }));
  flash.material.depthTest = false;
  flash.position.z = -16;
  flash.renderOrder = 990;
  camera.add(flash);

  // --- targeting computer HUD, hung off the lens so it can swing away
  const hud = await hudPanel();
  camera.add(hud.group);
  // Vader's canopy frame is also a lens attachment: a dark vignette that only
  // exists for the shots taken from inside his fighter.
  const canopy = tieCanopy();
  camera.add(canopy);
  scene.add(camera);

  // ------------------------------------------------------------------- sound
  ctx.sfx(0.2, 'xwing_flyby', { gain: 0.55, rate: 0.9 });
  ctx.sfx(T.FOIL_A + 0.05, 'blast_door_open', { gain: 0.5, rate: 1.7 });
  ctx.sfx(T.FOIL_B - 0.15, 'impact_hit', { gain: 0.45, rate: 1.5 });
  ctx.sfx(T.DIVE + 0.1, 'xwing_flyby', { gain: 0.7 });
  ctx.sfx(T.IN - 0.1, 'engine_rumble', { gain: 0.6, rate: 1.1 });
  for (const [tt, g] of [[6.9, 0.7], [7.6, 0.6], [9.1, 0.62], [9.8, 0.55], [11.0, 0.68], [11.7, 0.6]]) {
    ctx.sfx(tt, 'turbolaser', { gain: g });
    ctx.sfx(tt + 0.3, 'laser_impact', { gain: g * 0.6 });
  }
  ctx.sfx(8.2, 'xwing_flyby', { gain: 0.6, rate: 1.08 });
  ctx.sfx(T.TIES - 0.15, 'tie_scream', { gain: 0.85 });
  ctx.sfx(T.TIES + 1.5, 'tie_scream', { gain: 0.6, rate: 1.1 });
  for (const tt of [14.3, 15.1, 15.9, 16.6, 17.1]) ctx.sfx(tt, 'blaster_imperial', { gain: 0.6 });
  ctx.sfx(15.4, 'blaster_rebel', { gain: 0.5 });
  ctx.sfx(T.KILL, 'explosion_small', { gain: 0.9 });
  ctx.sfx(T.KILL + 0.22, 'brick_scatter', { gain: 0.5, rate: 1.2 });
  ctx.sfx(T.VADER - 0.3, 'vader_breath', { gain: 0.5 });
  for (const tt of [19.0, 19.4, 19.8, 20.4, 20.8]) ctx.sfx(tt, 'blaster_imperial', { gain: 0.5 });
  ctx.sfx(T.WIDE + 0.2, 'tie_scream', { gain: 0.45, rate: 0.92 });
  ctx.sfx(T.COCKPIT + 0.15, 'computer_beeps', { gain: 0.7 });
  ctx.sfx(T.HUD_OFF - 0.1, 'computer_beeps', { gain: 0.55, rate: 0.75 });
  ctx.sfx(T.OUT + 0.2, 'engine_rumble', { gain: 0.35, rate: 0.85 });
  ctx.sfx(T.FIRE, 'torpedo_launch', { gain: 0.95 });
  ctx.sfx(T.FIRE + 0.16, 'torpedo_launch', { gain: 0.8, rate: 1.08 });
  ctx.sfx(T.DROP, 'impact_hit', { gain: 0.7, rate: 0.7 });
  ctx.sfx(T.PULLUP + 0.1, 'xwing_flyby', { gain: 0.8 });
  ctx.sfx(T.CRACK + 0.3, 'engine_rumble', { gain: 0.4, rate: 0.55 });
  ctx.sfx(T.BOOM - 0.05, 'explosion_massive', { gain: 1.0 });
  ctx.sfx(T.BOOM + 0.6, 'brick_scatter', { gain: 0.9 });
  ctx.sfx(T.BOOM + 1.5, 'brick_scatter', { gain: 0.6, rate: 0.85 });
  ctx.sfx(T.BOOM + 2.6, 'explosion_big', { gain: 0.45, rate: 0.7 });
  ctx.sfx(T.SETTLE + 1.0, 'ship_pass', { gain: 0.5 });

  // ---------------------------------------------------------------- shot list
  // `rel` shots have their z measured from the lead fighter, so they ride along
  // with the run; everything else is in world space.
  const SHOTS = [
    // ---- 1. above the surface, S-foils lock -------------------------------
    {
      // high, near the trench axis: the canyon runs away under them so the dive
      // that follows has somewhere to go
      start: 0,
      rel: true,
      pos: [[0, [22, SURFACE_Y + 38, -104]], [T.FOIL_A, [17, SURFACE_Y + 30, -80]]],
      look: [[0, [-2, SURFACE_Y - 20, 74]], [T.FOIL_A, [-2, SURFACE_Y - 15, 56]]],
      fov: [[0, 42], [T.FOIL_A, 39]],
      handheld: 0.3,
      rate: 0.7,
    },
    {
      // Front quarter, close, on the sunlit side. The foils hinge about the roll
      // axis, so a true side-on view looks straight down the wings and shows
      // nothing; from here the four of them visibly scissor into the X.
      start: T.FOIL_A,
      rel: true,
      pos: [[T.FOIL_A, [18, SURFACE_Y - 3, 26]], [T.DIVE, [13, SURFACE_Y - 1, 19]]],
      look: [[T.FOIL_A, [-1, SURFACE_Y + 1, -3]], [T.DIVE, [-1, SURFACE_Y + 0.5, -4]]],
      fov: [[T.FOIL_A, 33], [T.DIVE, 36]],
      handheld: 0.12,
      rate: 0.9,
    },
    // ---- 2. into the trench ------------------------------------------------
    {
      // over the rim and down: the trench cuts the frame diagonally and the
      // squadron drops into it
      start: T.DIVE,
      rel: true,
      pos: [[T.DIVE, [58, SURFACE_Y + 26, -80]], [T.IN, [44, WALL_H + 22, -62]]],
      look: [[T.DIVE, [-4, SURFACE_Y - 22, 34]], [T.IN, [-2, FLY_Y + 4, 44]]],
      fov: [[T.DIVE, 44], [T.IN, 40]],
      shake: [[T.DIVE, 0.05], [T.IN, 0.2]],
    },
    {
      // low and behind the lead: a long lens so the walls tear past
      start: T.IN,
      rel: true,
      pos: [[T.IN, [3, FLY_Y + 6, -46]], [9.0, [-3, FLY_Y + 3.5, -38]]],
      look: [[T.IN, [0, FLY_Y + 1, 56]], [9.0, [0, FLY_Y, 60]]],
      fov: [[T.IN, 30], [9.0, 27]],
      shake: [[T.IN, 0.18], [9.0, 0.26]],
    },
    // Locked off on the trench floor: the only shot in the scene that does not
    // travel, so the squadron actually goes past something.
    { start: 9.0, rig: trench.floorRig },
    {
      // riding the starboard wall, tower firing down ahead
      start: 10.6,
      rel: true,
      pos: [[10.6, [20, FLY_Y + 9, -30]], [T.TIES, [18.5, FLY_Y + 6, -24]]],
      look: [[10.6, [-6, FLY_Y + 2, 66]], [T.TIES, [-8, FLY_Y + 3, 60]]],
      fov: [[10.6, 32], [T.TIES, 30]],
      shake: [[10.6, 0.24], [T.TIES, 0.3]],
    },
    // ---- 3. the pursuit ----------------------------------------------------
    {
      // behind and above the TIEs as they drop over the lip. Gets below the rim
      // fast: level with it, the lip slides across the lens.
      start: T.TIES,
      rel: true,
      pos: [[T.TIES, [-9, WALL_H + 22, -214]], [13.6, [-8, WALL_H - 8, -196]], [15.0, [-6, FLY_Y + 10, -172]]],
      look: [[T.TIES, [-2, WALL_H + 12, -138]], [15.0, [0, FLY_Y + 5, -116]]],
      fov: [[T.TIES, 40], [15.0, 34]],
      shake: [[T.TIES, 0.16], [15.0, 0.24]],
    },
    {
      // reverse: from out in front, the whole line of the squadron coming on
      start: 15.0,
      rel: true,
      pos: [[15.0, [9, FLY_Y + 4, 66]], [T.KILL, [5, FLY_Y + 3, 52]]],
      look: [[15.0, [-2, FLY_Y + 1, -46]], [T.KILL, [-9, FLY_Y + 1, -54]]],
      fov: [[15.0, 36], [T.KILL, 34]],
      shake: [[15.0, 0.22], [T.KILL, 0.34]],
    },
    {
      // the hit: across the trench from the trailing wingman as he goes. Stays
      // well inside the walls — anything past x = 20 is inside the masonry.
      start: T.KILL,
      rel: true,
      pos: [[T.KILL, [-14, FLY_Y + 9, -48]], [T.VADER, [-11, FLY_Y + 7, -40]]],
      look: [[T.KILL, [14, FLY_Y + 1.5, -78]], [T.VADER, [13, FLY_Y + 2, -76]]],
      fov: [[T.KILL, 40], [T.VADER, 38]],
      shake: [[T.KILL, 0.1], [T.KILL + 0.2, 0.7], [T.KILL + 1.2, 0.18], [T.VADER, 0.12]],
    },
    // ---- Vader's cockpit ---------------------------------------------------
    { start: T.VADER, rig: trench.vaderRig, handheld: 0.05, rate: 0.5 },
    {
      // wide of the trench: specks in a grey canyon. Held near the trench axis,
      // because from far out to one side the canyon is only a groove in a plain.
      start: T.WIDE,
      rel: true,
      pos: [[T.WIDE, [42, WALL_H + 66, -172]], [T.COCKPIT, [27, WALL_H + 50, -134]]],
      look: [[T.WIDE, [0, FLY_Y - 2, 94]], [T.COCKPIT, [0, FLY_Y, 72]]],
      fov: [[T.WIDE, 36], [T.COCKPIT, 34]],
      handheld: 0.3,
      rate: 0.6,
    },
    // ---- 4. the quiet beat -------------------------------------------------
    // Four set-ups on one seat: his eyeline, then progressively tighter on him.
    { start: T.COCKPIT, rig: trench.eyeRig },
    { start: T.FACE, rig: trench.cockpitRig },
    { start: T.HUD_OFF, rig: trench.cockpitRig },
    { start: T.BEN, rig: trench.cockpitRig },
    {
      // back outside; nothing but the walls sliding by
      start: T.OUT,
      rel: true,
      pos: [[T.OUT, [-17, FLY_Y + 6, -34]], [T.FIRE, [-12, FLY_Y + 4.5, -36]]],
      look: [[T.OUT, [0, FLY_Y + 1, 52]], [T.FIRE, [0, FLY_Y + 1, 58]]],
      fov: [[T.OUT, 34], [T.FIRE, 31]],
      shake: [[T.OUT, 0.07], [T.FIRE, 0.12]],
    },
    // ---- 5. the torpedoes --------------------------------------------------
    {
      // over the shoulder as they drop away: two red sparks running the floor
      start: T.FIRE,
      rel: true,
      pos: [[T.FIRE, [-14, FLY_Y + 7, -40]], [T.LOCK, [-9, FLY_Y + 5, -30]]],
      look: [[T.FIRE, [0, FLY_Y - 2, 70]], [T.LOCK, [0, FLY_Y - 4, 110]]],
      fov: [[T.FIRE, 33], [T.LOCK, 30]],
      shake: [[T.FIRE, 0.1], [T.FIRE + 0.25, 0.4], [T.LOCK, 0.16]],
    },
    { start: T.LOCK, rig: trench.portRig },
    {
      // up and out, hard. Stays between the walls until it is above the rim: the
      // trench is only 46 wide, so anything past x = 20 down here is masonry.
      start: T.PULLUP,
      rel: true,
      pos: [
        [T.PULLUP, [15, FLY_Y + 10, -48]],
        [T.PULLUP + 1.0, [23, WALL_H + 14, -40]],
        [T.SPACE, [70, WALL_H + 92, -24]],
      ],
      look: [[T.PULLUP, [0, FLY_Y + 4, 18]], [T.SPACE, [-4, WALL_H + 78, 44]]],
      fov: [[T.PULLUP, 40], [T.SPACE, 46]],
      shake: [[T.PULLUP, 0.3], [T.PULLUP + 1.4, 0.5], [T.SPACE, 0.2]],
    },
    // ---- 6. the station comes apart ---------------------------------------
    { start: T.SPACE, rig: space.rig, handheld: 0.9, rate: 0.24 },
  ];

  const bloom = { strength: 0.9, radius: 0.75, threshold: 0.55 };

  // ------------------------------------------------------------------ update
  return {
    scene,
    camera,
    bloom,
    update(t) {
      const inSpace = t >= T.SPACE;
      trench.group.visible = !inSpace;
      space.group.visible = inSpace;
      useRig(rigs, inSpace ? 'space' : 'trench');
      scene.background.setHex(inSpace ? 0x03050a : 0x05070c);

      if (inSpace) space.update(t);
      else trench.update(t, camera);

      hud.update(t);
      canopy.visible = t >= T.VADER && t < T.WIDE;

      // The one hard cut gets a white kick; the detonation gets a wall of it.
      // Short: the bricks are the payoff, and every frame of white is a frame of
      // them the audience does not get.
      const blast = 3.0 * ease.pulse(t, T.BOOM - 0.04, 0.05, 0.08, 0.4);
      flash.material.opacity = 0.45 * ease.pulse(t, T.SPACE - 0.06, 0.06, 0.03, 0.3) + blast;
      flash.visible = flash.material.opacity > 0.002;

      // The film reads inst.bloom every frame, so the explosion can simply
      // turn the whole projector up.
      const heat = ease.pulse(t, T.BOOM - 0.1, 0.2, 0.5, 4.2);
      bloom.strength = 0.9 + 1.5 * heat;
      bloom.threshold = 0.55 - 0.22 * heat;

      playShots(camera, t, SHOTS, odo);
    },
  };
}

// ---------------------------------------------------------------------------
// Shot playback
// ---------------------------------------------------------------------------

/**
 * Pick the shot covering `t` and pose the camera from its own tracks. Each shot
 * owns its keys, so a cut is a cut — no interpolation leaks across a boundary.
 * `rel` shots have their z offsets measured from the lead fighter.
 */
function playShots(camera, t, shots, odo) {
  let shot = shots[0];
  for (const s of shots) if (t >= s.start) shot = s;
  if (shot.rig) {
    shot.rig(t, camera);
  } else {
    const z = shot.rel ? odo(t) : 0;
    cameraRig(camera, t, {
      pos: shot.rel ? offsetZ(shot.pos, z) : shot.pos,
      look: shot.rel ? offsetZ(shot.look, z) : shot.look,
      fov: shot.fov,
      shake: shot.shake,
      roll: shot.roll,
      ease: shot.ease || ease.inOutCubic,
    });
  }
  if (shot.handheld) handheld(camera, t, shot.handheld, shot.rate ?? 0.4, shot.start);
  return shot;
}

/** Copy a position track with `dz` added to every key's z. Cheap enough. */
function offsetZ(keys, dz) {
  const out = [];
  for (const [kt, v] of keys) out.push([kt, [v[0], v[1], v[2] + dz]]);
  return out;
}

function useRig(rigs, name) {
  for (const key of Object.keys(rigs)) {
    const on = key === name;
    for (const k of Object.keys(rigs[key])) if (rigs[key][k]) rigs[key][k].visible = on;
  }
}

/**
 * Integrate a speed profile once, at build time, into a distance lookup. The
 * result is a pure function of t with a smoothly varying speed — which is what
 * keeps the walls from visibly jerking when the pace changes.
 */
function makeOdometer(speedKeys, tEnd, step = 0.02) {
  const n = Math.ceil((tEnd + 2) / step) + 2;
  const zs = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const v = ease.track(speedKeys, (i - 0.5) * step, ease.smooth);
    zs[i] = zs[i - 1] + v * step;
  }
  return (t) => {
    const x = Math.min(n - 1.001, Math.max(0, t / step));
    const i = Math.floor(x);
    return zs[i] + (zs[i + 1] - zs[i]) * (x - i);
  };
}

// ===========================================================================
// SET 1 — the trench
// ===========================================================================

async function buildTrench(ctx, { odo, flyY, portZ }) {
  const group = new THREE.Group();

  // --- the trench itself: one section, cloned and re-seated every frame
  const proto = collapse(trenchSection(SECTION));
  const sections = [];
  for (let i = 0; i < SECTIONS; i++) {
    const s = i === 0 ? proto : cloneCollapsed(proto);
    group.add(s);
    sections.push(s);
  }

  // Sky above the rim, so the walls have something to silhouette against and
  // the run over the surface does not happen against pure black.
  const sky = new Starfield({ count: 1100, radius: 2400, sizeMax: 3.6, seed: 41 });
  group.add(sky.object);

  // --- the exhaust port, at a fixed z the torpedoes are aimed at
  const port = exhaustPort();
  port.group.position.z = portZ;
  group.add(port.group);

  // --- three X-wings. These keep their real S-foil pivots (the wings have to
  // crack open on camera) but every mesh under each pivot is merged down.
  const xwings = [];
  for (let i = 0; i < 3; i++) {
    const ship = collapseArticulated(
      await fighters.buildXWing({
        trim: i === 0 ? COLORS.red : i === 1 ? COLORS.brightOrange : COLORS.yellow,
        droidTrim: i === 0 ? COLORS.blue : i === 1 ? COLORS.brightGreen : COLORS.red,
        sfoils: 0,
      }),
      1,
      0.3
    );
    ship.userData.setSFoils(0);
    group.add(ship);
    xwings.push(ship);
  }
  // Formation. Tight while they are still over the surface, then stretched out
  // to nearly line astern once they are in the trench: a 23-unit fighter needs
  // 40-odd units of clear air behind it before a long-lens chase shot reads.
  const SLOT_OPEN = [
    [0, 0, 0],
    [-13, -1.2, -17],
    [14, 1.4, -31],
  ];
  const SLOT = [
    [0, 0, 0],
    [-15, -2.4, -47],
    [16, 1.6, -78],
  ];
  /** Formation offset of X-wing `i` at scene time t. */
  const slotOf = (i, t) => {
    const s = ease.smooth(ease.range(t, T.DIVE, T.IN + 1.6));
    const a = SLOT_OPEN[i];
    const b = SLOT[i];
    return [ease.lerp(a[0], b[0], s), ease.lerp(a[1], b[1], s), ease.lerp(a[2], b[2], s)];
  };

  // --- the pursuit: two TIEs flanking the Advanced
  const ties = [];
  for (let i = 0; i < 3; i++) {
    const src = i === 1 ? await fighters.buildTieAdvanced({}) : await fighters.buildTieFighter({});
    const tie = collapse(src, 1, 0.4);
    tie.userData.enginePoints = (src.userData.enginePoints || []).map((p) => p.clone());
    tie.userData.gunPoints = (src.userData.gunPoints || []).map((p) => p.clone());
    tie.visible = false;
    group.add(tie);
    ties.push(tie);
  }
  // Close enough behind the trailing wingman that the view from the Advanced's
  // canopy has something in it larger than a speck.
  const TIE_SLOT = [
    [-20, 3, -134],
    [0, 0, -112],
    [20, -2, -138],
  ];

  // --- turbolaser towers on the rim. Each one is placed at the point the
  // squadron reaches at a chosen time, so its fire can be scheduled to land in
  // front of the camera rather than a hundred units behind it.
  const towers = [];
  const TOWER_PASS = [8.3, 10.5, 12.4];
  const TOWER_Z = TOWER_PASS.map((tt) => odo(tt));
  let capital = null;
  try {
    capital = await import('../kit/ships-capital.js');
  } catch {
    capital = null;
  }
  for (let i = 0; i < TOWER_Z.length; i++) {
    const src = capital?.buildTurbolaserTower ? await capital.buildTurbolaserTower({}) : fallbackTower();
    const tower = collapse(src, 1, 0.6);
    tower.scale.setScalar(2.6);
    tower.position.set((i % 2 ? 1 : -1) * (HALF_W + 12), WALL_H, TOWER_Z[i]);
    group.add(tower);
    towers.push(tower);
  }

  // --- bolts. Two pools: imperial green (TIEs and turbolasers) and rebel red.
  const green = new BoltPool({ max: 60, color: GREEN, length: 16, width: 0.34, glow: 1.1 });
  const red = new BoltPool({ max: 28, color: RED, length: 14, width: 0.3, glow: 1.0 });
  group.add(green.object, red.object);

  // Turbolaser fire raking down off the rim. Each tower gets a short burst
  // finishing just before the squadron goes underneath it.
  for (let k = 0; k < TOWER_Z.length; k++) {
    const sx = k % 2 ? 1 : -1;
    for (let j = 0; j < 4; j++) {
      const tt = TOWER_PASS[k] - 1.5 + j * 0.34;
      green.add({
        t0: tt,
        from: [sx * (HALF_W + 12), WALL_H + 16, TOWER_Z[k]],
        to: [
          sx * (HALF_W - 4) - sx * hash11(k * 4 + j, 3) * 22,
          1.2,
          TOWER_Z[k] - 26 - hash11(k * 4 + j, 4) * 40,
        ],
        speed: 300,
        scale: 1.8,
      });
    }
  }
  // ...plus a handful of near misses that come down the trench past the lens.
  for (let i = 0; i < 7; i++) {
    const tt = 7.0 + i * 0.72;
    const sx = i % 2 ? 1 : -1;
    green.add({
      t0: tt,
      from: [sx * (HALF_W + 10), WALL_H + 14, odo(tt) + 300],
      to: [sx * 5 + (hash11(i, 15) - 0.5) * 8, 1.2, odo(tt) - 40],
      speed: 480,
      scale: 1.5,
    });
  }
  // TIE fire, mostly missing, then finding the trailing X-wing.
  for (let i = 0; i < 20; i++) {
    const tt = 14.1 + i * 0.17;
    const shooter = i % 3;
    const aim = i > 13 ? 2 : i % 3;
    green.add({
      t0: tt,
      from: [
        TIE_SLOT[shooter][0] + (hash11(i, 5) - 0.5) * 6,
        FLY_Y + TIE_SLOT[shooter][1] + (hash11(i, 6) - 0.5) * 3,
        odo(tt) + TIE_SLOT[shooter][2] + 12,
      ],
      to: [
        SLOT[aim][0] + (i > 13 ? 0 : (hash11(i, 7) - 0.5) * 26),
        FLY_Y + SLOT[aim][1] + (i > 13 ? 0 : (hash11(i, 8) - 0.5) * 12),
        odo(tt + 0.34) + SLOT[aim][2],
      ],
      speed: 500,
    });
  }
  // A second volley from the Advanced during the shot taken from its canopy, so
  // the gunsight has tracer going through it.
  for (let i = 0; i < 12; i++) {
    const tt = T.VADER + 0.35 + i * 0.19;
    const sx = i % 2 ? 1 : -1;
    green.add({
      t0: tt,
      from: [TIE_SLOT[1][0] + sx * 2.4, FLY_Y + 0.4, odo(tt) + TIE_SLOT[1][2] + 7],
      to: [SLOT[1][0] + (hash11(i, 11) - 0.5) * 14, FLY_Y + SLOT[1][1] + (hash11(i, 12) - 0.5) * 8, odo(tt + 0.3) + SLOT[1][2]],
      speed: 520,
    });
  }
  // Rebel return fire down the trench.
  for (let i = 0; i < 8; i++) {
    const tt = 15.2 + i * 0.31;
    red.add({
      t0: tt,
      from: [SLOT[0][0] + (i % 2 ? 9 : -9), FLY_Y, odo(tt) + 10],
      to: [(hash11(i, 9) - 0.5) * 22, 2.0, odo(tt + 0.5) + 300],
      speed: 520,
    });
  }

  // --- the wingman that does not make it
  const kill = { pos: new THREE.Vector3(SLOT[2][0], FLY_Y + SLOT[2][1], odo(T.KILL) + SLOT[2][2]) };
  const debris = new BrickBurst(xwings[2].userData.parts || [], {
    t0: T.KILL,
    origin: kill.pos.clone(),
    matrixWorld: new THREE.Matrix4().makeTranslation(kill.pos.x, kill.pos.y, kill.pos.z),
    speed: 34,
    spin: 7,
    gravity: -3.5,
    spread: 1.1,
    radial: 1,
    max: 420,
    seed: 9,
  });
  group.add(debris.object);
  const killBall = new Fireball({ t0: T.KILL, life: 1.5, radius: 11, position: kill.pos.toArray() });
  group.add(killBall.object);
  const killSparks = new Sparks({
    count: 200,
    t0: T.KILL,
    life: 1.7,
    speed: 46,
    gravity: -6,
    color: 0xffd070,
    size: 0.9,
    seed: 23,
    origin: kill.pos.toArray(),
  });
  group.add(killSparks.points);

  // --- proton torpedoes: two glowing slugs and their trails
  const torps = new Torpedoes({
    t0: T.FIRE,
    t1: T.DROP,
    from: [[-9, FLY_Y - 1.2], [9, FLY_Y - 1.2]],
    portZ,
    odo,
  });
  group.add(torps.object);

  // --- engine flares for everything that has an engine
  const engines = new EngineGlow(40, KIT.engineBlue, 0.2);
  group.add(engines.object);
  const tieEngines = new EngineGlow(14, 0xffb060, 0.2);
  group.add(tieEngines.object);

  // --- the cockpit interior, for the quiet beat
  const cockpit = await cockpitInterior(ctx);
  group.add(cockpit.group);

  const wp = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  /** World position of X-wing `i` at scene time t. */
  const shipPos = (i, t, out) => {
    const [ox, oy, oz] = slotOf(i, t);
    const sway = Math.sin(t * (0.9 + i * 0.31) + i * 2.1) * (t < T.IN ? 2.6 : 1.5);
    return out.set(ox + sway, flyY(t) + oy + Math.sin(t * 1.4 + i) * 0.8, odo(t) + oz);
  };
  const tiePos = (i, t, out) => {
    const [ox, oy, oz] = TIE_SLOT[i];
    const in0 = ease.range(t, T.TIES, T.TIES + 1.5);
    return out.set(
      ox + Math.sin(t * 1.7 + i * 2.3) * 3.2,
      FLY_Y + oy + (1 - ease.outCubic(in0)) * (WALL_H + 34) + Math.sin(t * 2.1 + i) * 1.1,
      odo(t) + oz
    );
  };

  return {
    group,

    /**
     * Over Vader's shoulder: the camera sits in the Advanced's canopy on a long
     * lens, so the surviving X-wings ahead read as fighters rather than dots.
     */
    vaderRig(t, camera) {
      tiePos(1, t, tmp);
      camera.position.set(tmp.x, tmp.y + 1.4, tmp.z + 5.0);
      camera.up.set(0, 1, 0);
      // Track whichever wingman is still alive, so the gunsight has a target.
      shipPos(t < T.KILL ? 2 : 1, t, wp);
      camera.lookAt(wp.x, wp.y + 0.6, wp.z);
      setFov(camera, VADER_FOV);
    },

    /**
     * Locked off on the trench floor while the squadron comes over the top. The
     * only static camera in the run, and so the only place where the speed is
     * measured against the ground rather than against the walls.
     */
    floorRig(t, camera) {
      camera.position.set(-17, 2.4, odo(9.8));
      camera.up.set(0, 1, 0);
      shipPos(0, t, wp);
      camera.lookAt(wp.x, wp.y - 2.5, wp.z);
      setFov(camera, 42);
      handheld(camera, t, 0.2, 1.1, 4);
    },

    /**
     * The pilot's own eyeline. Wide, and tipped down far enough that the panel
     * coaming and the windscreen pillars frame the view — otherwise it is just a
     * shot of a corridor with no reason to believe anyone is flying.
     */
    eyeRig(t, camera) {
      shipPos(0, t, wp);
      const e = cockpit.eye;
      camera.position.set(wp.x + e.x, wp.y + e.y, wp.z + e.z);
      camera.up.set(0, 1, 0);
      camera.lookAt(wp.x + 0.5 * Math.sin(t * 0.4), wp.y + e.y - 4.4, wp.z + 40);
      setFov(camera, 52);
      handheld(camera, t, 0.035, 0.7, 1);
    },

    /** Round on his face. Three progressively tighter set-ups on one seat. */
    cockpitRig(t, camera) {
      shipPos(0, t, wp);
      const k = t < T.HUD_OFF ? 0 : t < T.BEN ? 1 : 2;
      // Offsets are in cockpit-set space: the seat floor is y = 0 and the pilot
      // faces +z, so these all sit out in front of him and look back.
      const off = [
        [-2.9, 5.7, 6.6],
        [-2.3, 5.5, 5.6],
        [-1.8, 5.35, 4.9],
      ][k];
      const at = [
        [0.1, 4.5, 1.1],
        [0.1, 4.7, 0.9],
        [0.1, 4.8, 0.6],
      ][k];
      const drift = 0.1 * Math.sin(t * 0.5);
      camera.position.set(wp.x + off[0] + drift, wp.y + off[1], wp.z + off[2]);
      camera.up.set(0, 1, 0);
      camera.lookAt(wp.x + at[0], wp.y + at[1], wp.z + at[2]);
      setFov(camera, [33, 29, 26][k]);
      handheld(camera, t, 0.018, 0.45, k);
    },

    /**
     * Ahead of the port looking back up the trench, so the torpedoes come at
     * the lens and drop into the floor a few feet in front of it — and the
     * X-wing thunders over the top a moment later.
     */
    portRig(t, camera) {
      const u = ease.range(t, T.LOCK, T.PULLUP);
      const e = ease.inOutCubic(u);
      camera.position.set(ease.lerp(17, 6, e), ease.lerp(16, 7.5, e), portZ + ease.lerp(50, 24, e));
      camera.up.set(0, 1, 0);
      // The aim rises to catch the fighter thundering over the port a beat after
      // the hit, then drops back into the glowing shaft.
      const at = ease.track(
        [
          [T.LOCK, [0, 1, portZ - 34]],
          [T.DROP + 0.2, [0, -1, portZ - 3]],
          [36.5, [0, 15, portZ - 24]],
          [37.1, [0, 2, portZ - 4]],
          [T.PULLUP, [0, -5, portZ + 1]],
        ],
        t
      );
      camera.lookAt(at[0], at[1], at[2]);
      setFov(camera, ease.lerp(36, 45, e));
      handheld(camera, t, 0.09, 0.8, 3);
    },

    update(t, camera) {
      const dist = odo(t);
      sky.update(t);

      // Re-seat the sections: one behind the fighters, the rest ahead.
      const base = Math.floor(dist / SECTION);
      for (let i = 0; i < SECTIONS; i++) sections[i].position.z = (base + i - 1) * SECTION;

      // --- X-wings
      let n = 0;
      const foils = ease.smooth(ease.range(t, T.FOIL_A, T.FOIL_B));
      const bank = ease.range(t, T.DIVE, T.IN);
      const climb = ease.range(t, T.PULLUP, T.PULLUP + 2.4);
      const inCockpit = t >= T.COCKPIT - 0.25 && t < T.OUT - 0.02;
      for (let i = 0; i < xwings.length; i++) {
        const ship = xwings[i];
        const dead = i === 2 && t >= T.KILL;
        // The lead is switched off while the camera is inside it: the cockpit
        // set is at minifig scale and would otherwise be full of hull.
        ship.visible = !dead && !(i === 0 && inCockpit);
        if (!ship.visible) continue;
        ship.userData.setSFoils(i === 0 ? foils : ease.smooth(ease.range(t, T.FOIL_A + 0.18 * i, T.FOIL_B + 0.18 * i)));
        shipPos(i, t, wp);
        ship.position.copy(wp);
        // Roll into the dive, then pitch up out of the trench at the end.
        ship.rotation.set(
          -ease.smooth(bank) * 0.36 * (1 - ease.range(t, T.IN, T.IN + 0.8)) + ease.inOutCubic(climb) * 0.85,
          Math.sin(t * 0.7 + i) * 0.02,
          Math.sin(t * (1.1 + i * 0.4) + i * 2) * 0.09 - ease.smooth(bank) * 0.5 * (1 - ease.range(t, T.IN, T.IN + 1.1))
        );
        ship.updateMatrixWorld();
        const throttle = 0.8 + 0.2 * Math.sin(t * 7 + i) + climb * 0.2;
        for (const p of ship.userData.enginePoints) {
          tmp.copy(p).applyMatrix4(ship.matrixWorld);
          if (engines.set(n, tmp, ship.quaternion, 0.62, 7 + throttle * 5, throttle, t)) n++;
        }
      }
      engines.flush(n);

      // --- TIEs
      let m = 0;
      const tiesOn = t >= T.TIES - 0.3 && t < T.SPACE;
      for (let i = 0; i < ties.length; i++) {
        const tie = ties[i];
        tie.visible = tiesOn;
        if (!tiesOn) continue;
        tiePos(i, t, wp);
        tie.position.copy(wp);
        tie.rotation.set(
          -0.9 * (1 - ease.outCubic(ease.range(t, T.TIES, T.TIES + 1.4))),
          Math.sin(t * 0.9 + i * 1.7) * 0.05,
          Math.sin(t * 1.6 + i * 2.4) * 0.16
        );
        tie.updateMatrixWorld();
        for (const p of tie.userData.enginePoints) {
          tmp.copy(p).applyMatrix4(tie.matrixWorld);
          if (tieEngines.set(m, tmp, tie.quaternion, 0.5, 5, 0.85, t)) m++;
        }
      }
      tieEngines.flush(m);

      // --- towers: track the fighters and elevate as they close
      for (let i = 0; i < towers.length; i++) {
        const tw = towers[i];
        const dz = dist - tw.position.z;
        tw.rotation.y = Math.atan2(-tw.position.x, -dz - 60) + Math.PI;
      }

      // --- effects
      green.update(t, camera);
      red.update(t, camera);
      debris.object.visible = t >= T.KILL && t < T.WIDE + 3;
      if (debris.object.visible) debris.update(t);
      killBall.update(t);
      killSparks.update(t);
      torps.update(t);
      port.update(t);

      // --- the cockpit set only exists while we are inside it
      cockpit.group.visible = inCockpit;
      if (inCockpit) {
        shipPos(0, t, wp);
        cockpit.group.position.copy(wp);
        cockpit.update(t);
      }
    },
  };
}

/**
 * One tileable length of trench: floor, two walls, the rim lip and a strip of
 * station surface above. All greebling is a deterministic hash of its index, so
 * every clone of this section is identical and the tiling is seamless.
 */
function trenchSection(len) {
  const b = new Bricks({ studSegments: 5 });
  const grey = COLORS.darkBluishGray;
  const light = COLORS.lightBluishGray;
  const dark = COLORS.black;
  const deep = COLORS.trueBlack;
  const metal = COLORS.flatSilver;
  const flat = { studs: false };
  const P = (world) => world / PLATE; // world units -> plates
  const inner = (sx, w) => (sx > 0 ? HALF_W - w : -HALF_W);

  // --- floor: one slab, lengthways channels, and wide panel joints
  b.box(-HALF_W, P(-2), 0, HALF_W * 2, len, P(2), grey, flat);
  for (const x of [-17, -7, 6, 15]) b.box(x, P(-0.15), 0, 2, len, P(0.3), deep, flat);
  for (let i = 0; i < Math.round(len / 16); i++) {
    const z = i * 16 + 1;
    const sx = hash11(i, 61) > 0.5 ? 1 : -1;
    b.box(sx * 4 - 9, P(-0.12), z, 18, 5, P(0.35), hash11(i, 62) > 0.6 ? dark : grey, flat);
  }

  // --- walls
  for (const sx of [-1, 1]) {
    const face = sx > 0 ? HALF_W : -HALF_W - 7;
    b.box(face, P(-2), 0, 7, len, P(WALL_H + 2), grey, flat);
    // vertical service ribs: the main thing the eye tracks at speed
    for (let i = 0; i < Math.round(len / 11); i++) {
      const z = i * 11 + (sx > 0 ? 0 : 5.5);
      const w = 1.4 + hash11(i * 2 + (sx > 0 ? 0 : 1), 71) * 1.6;
      b.box(inner(sx, w), P(1), z, w, 2.4, P(WALL_H - 3), hash11(i, 72) > 0.55 ? light : grey, flat);
    }
    // horizontal bands
    for (const y of [7, 16, 26]) {
      b.box(inner(sx, 1.2), P(y), 0, 1.2, len, P(1.4), dark, flat);
    }
    // greeble boxes, pipes and recessed panels
    const n = Math.round(len * 0.34);
    for (let i = 0; i < n; i++) {
      const s = i * 2 + (sx > 0 ? 0 : 1);
      const z = hash11(s, 81) * len;
      const y = 2 + hash11(s, 82) * (WALL_H - 8);
      const kind = hash11(s, 83);
      const d = 2 + hash11(s, 84) * 9;
      if (kind < 0.2) {
        // pipe running along the wall
        b.push();
        b.translate(inner(sx, 0) + (sx > 0 ? -0.9 : 0.9), P(y), z);
        b.rotateX(Math.PI / 2);
        b.cyl(0, 0, 0, 0.5 + hash11(s, 85) * 0.7, d * 2, metal, { segments: 8, studs: false });
        b.pop();
      } else if (kind < 0.34) {
        // dark recess
        b.box(inner(sx, 0.6), P(y), z, 0.6, d, P(1.6 + hash11(s, 86) * 3.4), deep, flat);
      } else if (kind < 0.44) {
        // lit slot
        b.box(inner(sx, 0.7), P(y), z, 0.7, 1.6 + hash11(s, 87) * 3, P(0.7), COLORS.transNeonOrange, {
          studs: false,
          finish: 'glow',
          emissive: 0xb2691c,
          emissiveIntensity: 0.55,
        });
      } else {
        const w = 0.9 + hash11(s, 88) * 2.6;
        b.box(inner(sx, w), P(y), z, w, d, P(1 + hash11(s, 89) * 4), hash11(s, 90) > 0.5 ? light : grey, flat);
      }
    }
    // --- rim lip and the station surface above it
    b.box(sx > 0 ? HALF_W - 1.6 : -HALF_W - 6, P(WALL_H), 0, 8, len, P(1.6), light, flat);
    b.box(sx > 0 ? HALF_W + 6 : -142, P(WALL_H - 1.2), 0, 136, len, P(1.2), grey, flat);
    // Long conduits running with the trench. These are what tell the eye how
    // fast the squadron is moving in the shots taken above the rim.
    for (const [off, w, c] of [[14, 2.4, dark], [22, 1.2, light], [46, 3.2, dark], [78, 1.6, light]]) {
      b.box(sx > 0 ? HALF_W + off : -HALF_W - off - w, P(WALL_H), 0, w, len, P(0.6), c, flat);
    }
    // Hull plating: mostly wide, flat panels with a scattering of low structures.
    // Tall boxes out here read as a toy city rather than as a battle station.
    const sn = Math.round(len * 0.42);
    for (let i = 0; i < sn; i++) {
      const s = i * 2 + (sx > 0 ? 0 : 1);
      const x = sx * (HALF_W + 8 + hash11(s, 101) * 122);
      const z = hash11(s, 102) * len;
      const kind = hash11(s, 107);
      if (kind > 0.9) {
        // a blockhouse or gun emplacement
        const w = 4 + hash11(s, 103) * 7;
        b.box(x - w / 2, P(WALL_H), z, w, 4 + hash11(s, 104) * 8, P(2 + hash11(s, 105) * 5), grey, flat);
      } else {
        const w = 7 + hash11(s, 103) * 26;
        const d = 7 + hash11(s, 104) * 30;
        b.box(x - w / 2, P(WALL_H), z, w, d, P(0.4 + hash11(s, 105) * 1.1), kind > 0.66 ? dark : kind > 0.3 ? light : grey, flat);
      }
    }
  }

  return b.build({ castShadow: false, receiveShadow: false });
}

/** The thermal exhaust port: a small square mouth in the trench floor. */
function exhaustPort() {
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.darkBluishGray;
  const light = COLORS.lightBluishGray;
  const P = (w) => w / PLATE;
  const flat = { studs: false };

  // A raised collar of plate around a black square, plus warning hatching.
  for (const [r0, r1, c] of [
    [9, 12, grey],
    [6.4, 9, light],
  ]) {
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const w = ax !== 0 ? r1 - r0 : r1 * 2;
      const d = az !== 0 ? r1 - r0 : r1 * 2;
      b.box(ax !== 0 ? ax * r0 - (ax > 0 ? 0 : w) : -w / 2, P(0.05), az !== 0 ? az * r0 - (az > 0 ? 0 : d) : -d / 2, w, d, P(0.9), c, flat);
    }
  }
  for (let i = 0; i < 8; i++) {
    b.box(-6.4 + i * 1.6, P(1.0), -7.6, 1.6, 1.2, P(0.3), i % 2 ? COLORS.yellow : COLORS.trueBlack, flat);
    b.box(-6.4 + i * 1.6, P(1.0), 6.4, 1.6, 1.2, P(0.3), i % 2 ? COLORS.trueBlack : COLORS.yellow, flat);
  }
  // The shaft: a black square well with a deep red pilot light far below.
  b.box(-6.4, P(-30), -6.4, 12.8, 12.8, P(30), COLORS.trueBlack, flat);
  for (let i = 1; i <= 5; i++) {
    b.box(-6.2, P(-i * 5), -6.2, 12.4, 0.5, P(0.5), COLORS.darkBluishGray, flat);
    b.box(-6.2, P(-i * 5), 5.7, 12.4, 0.5, P(0.5), COLORS.darkBluishGray, flat);
  }
  const mesh = b.build({ castShadow: false, receiveShadow: false });

  const group = new THREE.Group();
  group.add(mesh);
  // Reactor light down the shaft, plus a lip glow that flares on impact.
  const deepGlow = glowSprite(0xff5a1e, 26, 0.35);
  deepGlow.position.y = -22;
  group.add(deepGlow);
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), additiveMaterial(0xff8a3a, { opacity: 0.2 }));
  lip.rotation.x = -Math.PI / 2;
  lip.position.y = 0.6;
  group.add(lip);

  return {
    group,
    update(t) {
      const hit = ease.pulse(t, T.DROP - 0.05, 0.12, 0.15, 1.1);
      // After the hit the shaft never goes cold again — the reactor is running
      // away, which is the only warning the audience gets before the wide shot.
      const cook = ease.smooth(ease.range(t, T.DROP + 0.5, T.PULLUP + 2.2));
      const breathe = 0.75 + 0.25 * Math.sin(t * 2.4);
      deepGlow.material.opacity = 0.3 * breathe + 1.4 * hit + 1.5 * cook;
      deepGlow.scale.setScalar(26 * (1 + 1.4 * hit + 0.9 * cook));
      lip.material.opacity = 0.16 * breathe + 1.1 * hit + 0.8 * cook;
    },
  };
}

/**
 * Two proton torpedoes: additive slugs with tapered trails that converge on the
 * port and vanish into it. Positions are a straight lerp in t, so the whole
 * thing is one line of state-free maths.
 */
class Torpedoes {
  constructor({ t0, t1, from, portZ, odo }) {
    this.t0 = t0;
    this.t1 = t1;
    this.portZ = portZ;
    this.from = from;
    this.odo = odo;
    this.object = new THREE.Group();
    this.items = from.map(() => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), additiveMaterial(0xff6a3c, { opacity: 0.95 }));
      const trail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 34, 10, 1, true), additiveMaterial(0xff3a18, { opacity: 0.3 }));
      trail.geometry.translate(0, -17, 0);
      trail.geometry.rotateX(-Math.PI / 2); // taper trailing behind -z
      const flare = glowSprite(0xff7a44, 7.5, 0.8);
      g.add(head, trail, flare);
      g.renderOrder = 7;
      this.object.add(g);
      return g;
    });
  }
  update(t) {
    const u = ease.range(t, this.t0, this.t1);
    const live = t >= this.t0 - 0.02 && u < 1;
    this.object.visible = live;
    if (!live) return;
    const z0 = this.odo(this.t0);
    // Down the trench for the first 88% of the run, then straight down the shaft:
    // the dive has to start only once they are actually over the mouth.
    const run = Math.min(1, u / 0.88);
    const dive = Math.pow(ease.range(u, 0.88, 1), 2);
    for (let i = 0; i < this.items.length; i++) {
      const g = this.items[i];
      const [x0, y0] = this.from[i];
      // Converge on the mouth but stay a couple of units apart, or the two of
      // them overlap into one blob for the whole approach.
      g.position.set(
        ease.lerp(x0, Math.sign(x0) * 2.4, ease.inOutCubic(run)),
        ease.lerp(y0, 4.6, ease.inQuad(run)) - 21 * dive,
        ease.lerp(z0 + 12, this.portZ, ease.lerp(run, ease.inQuad(run), 0.3))
      );
      const pitch = -0.08 - 1.42 * ease.range(u, 0.8, 0.96);
      g.rotation.set(pitch, 0, 0);
      const fade = 1 - ease.range(u, 0.94, 1);
      g.children[0].material.opacity = 0.95 * fade;
      g.children[1].material.opacity = 0.3 * fade;
      g.children[2].material.opacity = 0.8 * fade;
    }
  }
}

/**
 * The lead cockpit: an open tub with a seated pilot, instrument panel and
 * canopy rails. Only ever seen from a couple of feet away, so it is small and
 * cheap; the trench walls streaming past outside do the rest.
 */
async function cockpitInterior(ctx) {
  void ctx;
  const group = new THREE.Group();
  const b = new Bricks({ studSegments: 8 });
  const grey = COLORS.darkBluishGray;
  const light = COLORS.lightBluishGray;
  const dark = COLORS.trueBlack;
  const flat = { studs: false };
  const box = (w, h, d, x, y, z, color, opts = flat) =>
    b.addGeometry(new THREE.BoxGeometry(w, h, d), { x, y, z, color, opts });

  // A minifig is 5.3 tall, so the tub is built around that rather than around
  // the X-wing model (which is nearer midi scale). The fighter itself is hidden
  // for these shots, so the mismatch never shows.
  box(4.6, 0.4, 6.4, 0, -0.2, 0, dark); // floor
  box(3.4, 0.5, 2.6, 0, 0.25, -1.0, grey); // seat pan
  box(3.4, 3.4, 0.5, 0, 1.9, -2.5, grey); // seat back
  box(1.9, 0.5, 0.6, 0, 3.7, -2.3, light); // head rest
  for (const sx of [-1, 1]) {
    box(0.6, 2.6, 6.0, sx * 2.0, 1.1, 0, grey); // side wall
    box(0.9, 0.5, 6.0, sx * 1.85, 2.55, 0, light); // sill
    box(0.34, 0.34, 5.6, sx * 2.0, 3.5, 0.1, COLORS.flatSilver); // canopy rail
    // Windscreen pillars, angling in above the panel. These are what the
    // point-of-view set-up sees at the edges of frame.
    b.push();
    b.translateWorld(sx * 2.05, 4.9, 3.15);
    b.rotateZ(sx * 0.2);
    box(0.3, 3.0, 0.3, 0, 0, 0, grey);
    b.pop();
  }
  box(4.3, 0.28, 0.3, 0, 6.35, 3.05, grey); // windscreen header
  // Instrument panel, canted so its face looks up at the pilot. The lens sits in
  // front of him, so it sees the panel's outside: give that side some structure
  // rather than leaving a blank grey slab in the corner of every frame.
  b.push();
  b.translateWorld(0, 2.7, 2.5);
  b.rotateX(0.6);
  box(3.9, 2.2, 0.45, 0, 0, 0, grey);
  box(4.2, 0.34, 0.7, 0, 1.2, 0.05, light); // coaming along the top edge
  box(4.2, 0.24, 0.62, 0, -1.15, 0.02, dark);
  for (const sx of [-1, 1]) box(0.3, 2.0, 0.62, sx * 1.75, 0, 0.05, dark); // corner posts
  box(2.2, 0.16, 0.6, 0, 0.35, 0.06, dark); // panel line
  box(1.1, 0.5, 0.55, -0.9, -0.5, 0.08, COLORS.flatSilver); // vent
  b.pop();
  box(0.24, 2.6, 0.24, 0.7, 2.2, 0.55, dark); // control column
  box(0.72, 0.32, 0.5, 0.7, 3.5, 0.45, COLORS.red); // grip, under his right hand
  box(0.5, 0.9, 0.34, -0.95, 3.2, 0.9, COLORS.darkBluishGray); // throttle quadrant
  group.add(b.build({ castShadow: false, receiveShadow: false }));

  // Two amber lamps on the outside face of the coaming, so the panel is not
  // just a silhouette from where the camera sits.
  const ob = new Bricks();
  for (const x of [-1.3, 1.35]) {
    ob.push();
    ob.translateWorld(x, 2.7 + 1.2 * Math.cos(0.6) + 0.4 * Math.sin(0.6), 2.5 - 1.2 * Math.sin(0.6) + 0.4 * Math.cos(0.6));
    ob.rotateX(0.6);
    ob.addGeometry(new THREE.BoxGeometry(0.26, 0.09, 0.08), {
      color: 0xffb03a,
      opts: { studs: false, finish: 'glow', emissive: 0xffb03a, emissiveIntensity: 0.9 },
    });
    ob.pop();
  }
  group.add(ob.build({ castShadow: false, receiveShadow: false }));

  // Instrument lights on the panel face. They point at the pilot, so what the
  // lens in front of him sees is their spill rather than the lamps themselves.
  const lb = new Bricks();
  for (let i = 0; i < 18; i++) {
    const c = hash11(i, 31) > 0.6 ? 0xff6a3a : hash11(i, 32) > 0.5 ? 0x66ddaa : 0xffc046;
    const row = Math.floor(i / 9);
    lb.push();
    lb.translateWorld(-1.6 + (i % 9) * 0.4, 2.7 + (0.72 - row * 0.62) * Math.cos(0.6) - 0.24 * Math.sin(0.6), 2.5 - (0.72 - row * 0.62) * Math.sin(0.6) - 0.24 * Math.cos(0.6));
    lb.rotateX(0.6);
    lb.addGeometry(new THREE.BoxGeometry(0.24, 0.14, 0.08), {
      color: c,
      opts: { studs: false, finish: 'glow', emissive: c, emissiveIntensity: 1.5 },
    });
    lb.pop();
  }
  group.add(lb.build({ castShadow: false, receiveShadow: false }));

  // The pilot. Seated: legs forward, hands on the stick.
  let pilot = null;
  try {
    const chars = await import('../kit/characters.js');
    pilot = await chars.makePilot({ variant: 0 });
  } catch {
    pilot = null;
  }
  if (pilot) {
    pilot.root.position.set(0, 0.5, -0.9);
    if (pilot.legL) pilot.legL.rotation.x = -1.4;
    if (pilot.legR) pilot.legR.rotation.x = -1.34;
    // Hands down and in, on the stick and the throttle. Any further forward and
    // the forearms point straight at the lens and read as mittens.
    if (pilot.armL) pilot.armL.rotation.set(-0.62, 0, -0.5);
    if (pilot.armR) pilot.armR.rotation.set(-0.72, 0, 0.46);
    group.add(pilot.root);
  }

  // The targeting scope: a real object on a hinge in front of his right eye,
  // so the audience watches him physically swing it out of the way.
  const scope = await targetingScope();
  group.add(scope.group);

  // Panel bounce, the scope's own green spill, and the cool wash that arrives
  // on the Obi-Wan line.
  const warm = new THREE.PointLight(0xffb070, 2.2, 11, 1.6);
  warm.position.set(0, 3.1, 2.0);
  group.add(warm);
  const scopeLight = new THREE.PointLight(0x7dff9e, 0, 5, 1.8);
  scopeLight.position.set(0.5, 4.7, 1.9);
  group.add(scopeLight);
  const cool = new THREE.PointLight(0x9fd8ff, 0, 26, 0.9);
  cool.position.set(-3.2, 6.0, 2.0);
  group.add(cool);
  // The glow itself, off his left shoulder and forward of it, so the lens in
  // front of him actually sees the thing the Obi-Wan line is attached to.
  const halo = glowSprite(0xb4e4ff, 7, 0);
  halo.position.set(-2.7, 5.5, 0.5);
  group.add(halo);

  return {
    group,
    /** Where his eyes are, for the point-of-view set-up. */
    eye: new THREE.Vector3(0, 4.75, 0.55),
    update(t) {
      // Head settles, then bows as he closes his eyes and stops aiming.
      const calm = ease.smooth(ease.range(t, T.HUD_OFF, T.BEN + 0.6));
      if (pilot?.head) {
        pilot.head.rotation.x = 0.05 + calm * 0.2;
        pilot.head.rotation.y = Math.sin(t * 0.6) * 0.06 * (1 - calm);
      }
      if (pilot?.root) pilot.root.position.y = 0.5 + Math.sin(t * 3.1) * 0.014;
      scope.update(t);
      scopeLight.intensity = 2.6 * scope.on;
      const ben = ease.pulse(t, T.BEN - 0.65, 1.2, 1.9, 1.6);
      // The warm panel light backs right off while the blue is up, otherwise the
      // two cancel out and the beat reads as no change at all.
      warm.intensity = 2.2 * (0.9 + 0.1 * Math.sin(t * 11)) * (1 - calm * 0.35) * (1 - ben * 0.62);
      cool.intensity = 20 * ben;
      halo.material.opacity = 0.9 * ben;
      halo.scale.setScalar(7 * (1 + 0.15 * Math.sin(t * 1.7)));
    },
  };
}

/**
 * The targeting computer as a physical scope: a green screen on a hinged arm
 * that drops in front of the pilot's eye and, at T.HUD_OFF, folds back up.
 */
async function targetingScope() {
  let tex = null;
  try {
    tex = await svgTexture('svg/hud-targeting.svg', { w: 512, h: 512 });
  } catch {
    tex = null;
  }
  const group = new THREE.Group();
  group.position.set(0.66, 5.7, 1.75); // the hinge, up under the canopy rail

  const arm = new THREE.Group();
  group.add(arm);
  // Housing and stalk, so it is a piece of equipment rather than a floating
  // rectangle. Built pointing down from the hinge.
  const b = new Bricks();
  const flat = { studs: false };
  b.addGeometry(new THREE.BoxGeometry(0.22, 0.9, 0.22), { y: -0.45, color: COLORS.darkBluishGray, opts: flat });
  b.addGeometry(new THREE.BoxGeometry(0.98, 0.14, 0.2), { y: -0.98, color: COLORS.trueBlack, opts: flat });
  b.addGeometry(new THREE.BoxGeometry(0.98, 0.14, 0.2), { y: -1.72, color: COLORS.trueBlack, opts: flat });
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.BoxGeometry(0.12, 0.9, 0.2), { x: sx * 0.43, y: -1.35, color: COLORS.trueBlack, opts: flat });
  }
  arm.add(b.build({ castShadow: false, receiveShadow: false }));

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.62),
    additiveMaterial(0x66ff9a, { map: tex, opacity: 0 })
  );
  glass.position.set(0, -1.35, -0.02);
  glass.rotation.y = Math.PI; // the artwork faces the pilot, at -z
  glass.renderOrder = 12;
  arm.add(glass);

  const api = {
    group,
    on: 0,
    update(t) {
      // Already down when we cut round to him; folds up on the switch-off.
      const out = ease.smooth(ease.range(t, T.HUD_OFF, T.HUD_OFF + 0.8));
      const live = t >= T.FACE - 0.1 && out < 1;
      group.visible = live;
      if (!live) {
        api.on = 0;
        return;
      }
      arm.rotation.x = ease.lerp(0, -2.0, out);
      let a = (1 - out) * (0.9 + 0.1 * Math.sin(t * 19));
      // A last flicker as the screen dies.
      if (out > 0.02 && out < 0.55) a *= 0.35 + 0.65 * Math.abs(Math.sin(t * 40));
      api.on = a;
      glass.material.opacity = 0.95 * a;
    },
  };
  return api;
}

/**
 * The same targeting screen seen from the pilot's own eye: a plane hung off the
 * lens that swings down into the middle of the frame. Only used for the
 * point-of-view set-up — once we cut round to his face, the physical scope in
 * the cockpit set takes over.
 */
async function hudPanel() {
  let tex = null;
  try {
    tex = await svgTexture('svg/hud-targeting.svg', { w: 512, h: 512 });
  } catch {
    tex = null;
  }
  const mat = additiveMaterial(0x66ff9a, { map: tex, opacity: 0 });
  mat.depthTest = false;
  // Sized against the frame it hangs in: at 1.05 from the lens the 44-degree
  // point-of-view field is 0.76 of visible height, so a 0.42 plate reads as a
  // reticle over the middle of the view rather than a green wash over all of it.
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat);
  plate.position.y = -0.3;
  const arm = new THREE.Group(); // the hinge the whole thing swings on
  arm.position.set(0.06, 0.3, -1.05);
  arm.add(plate);
  const group = new THREE.Group();
  group.add(arm);
  group.renderOrder = 900;

  return {
    group,
    update(t) {
      const inA = ease.smooth(ease.range(t, T.COCKPIT + 0.25, T.COCKPIT + 1.25));
      group.visible = t >= T.COCKPIT + 0.2 && t < T.FACE;
      if (!group.visible) return;
      arm.rotation.x = ease.lerp(-1.55, 0, inA);
      mat.opacity = 0.9 * inA * (0.88 + 0.12 * Math.sin(t * 17));
    },
  };
}

/**
 * A dark canopy frame for the shots taken from inside Vader's fighter. Parented
 * to the camera, so it sits at a fixed place on the lens: a ring of unlit bars
 * just outside the safe area plus a thin cross through the middle.
 */
function tieCanopy() {
  const Z = -1.0; // three.js cameras look down their own -z
  // The visible half-extents of the frame at Z, for VADER_FOV and a 16:9 frame
  // with the film's letterbox already taken off the top and bottom.
  const HH = Math.tan(((VADER_FOV / 2) * Math.PI) / 180) * Math.abs(Z) * 0.895;
  const HW = HH * (16 / 9);
  const IN_X = HW * 0.84; // where the mask's window edge sits
  const IN_Y = HH * 0.8;
  const shapes = [];

  // The mask: a rectangle with an octagonal hole cut in it. Whatever is outside
  // the hole is opaque, which is what makes this read as a window rather than as
  // a few floating bars.
  const outer = new THREE.Shape();
  outer.moveTo(-HW * 3, -HH * 3);
  outer.lineTo(HW * 3, -HH * 3);
  outer.lineTo(HW * 3, HH * 3);
  outer.lineTo(-HW * 3, HH * 3);
  outer.closePath();
  const cut = new THREE.Path();
  const cx = IN_X * 0.62;
  const cy = IN_Y * 0.62;
  const pts = [
    [-cx, IN_Y], [cx, IN_Y], [IN_X, cy], [IN_X, -cy],
    [cx, -IN_Y], [-cx, -IN_Y], [-IN_X, -cy], [-IN_X, cy],
  ];
  cut.moveTo(pts[0][0], pts[0][1]);
  for (let i = pts.length - 1; i >= 1; i--) cut.lineTo(pts[i][0], pts[i][1]);
  cut.closePath();
  outer.holes.push(cut);
  shapes.push(outer);

  // Window bars: two verticals and one horizontal, thin enough to see past.
  const bar = (w, h, x, y) => {
    const s = new THREE.Shape();
    s.moveTo(x - w / 2, y - h / 2);
    s.lineTo(x + w / 2, y - h / 2);
    s.lineTo(x + w / 2, y + h / 2);
    s.lineTo(x - w / 2, y + h / 2);
    s.closePath();
    shapes.push(s);
  };
  bar(0.005, IN_Y * 2, -IN_X * 0.42, 0);
  bar(0.005, IN_Y * 2, IN_X * 0.42, 0);
  bar(IN_X * 2, 0.004, 0, 0);
  // A gunsight cross in the middle of the pane.
  bar(0.0035, IN_Y * 0.4, 0, 0);
  bar(IN_X * 0.3, 0.003, 0, 0);

  const geo = new THREE.ShapeGeometry(shapes);
  geo.translate(0, 0, Z);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x04060a, toneMapped: false, depthTest: false, side: THREE.DoubleSide })
  );
  mesh.renderOrder = 920;
  mesh.frustumCulled = false;
  return mesh;
}

/** Stand-in rim gun, if `ships-capital.js` has not landed. */
function fallbackTower() {
  const b = new Bricks({ studSegments: 8 });
  const grey = COLORS.darkBluishGray;
  const light = COLORS.lightBluishGray;
  const flat = { studs: false };
  b.cyl(0, 0, 0, 4.0, 3, grey, { segments: 14, studs: false });
  b.cyl(0, 3, 0, 2.6, 6, light, { segments: 12, studs: false });
  b.box(-2.2, 9, -2.2, 4.4, 4.4, 6, grey, flat);
  for (const sx of [-1, 1]) b.cyl(sx * 1.1, 12, 3.0, 0.55, 14, COLORS.flatSilver, { segments: 8, studs: false });
  return b.build({ castShadow: false, receiveShadow: false });
}

// ===========================================================================
// SET 2 — the station comes apart
// ===========================================================================

async function buildSpace() {
  const group = new THREE.Group();

  const stars = new Starfield({ count: 2000, radius: 2600, sizeMax: 4.0, seed: 53 });
  group.add(stars.object);

  let capital = null;
  try {
    capital = await import('../kit/ships-capital.js');
  } catch {
    capital = null;
  }
  const station = capital?.buildDeathStar
    ? await capital.buildDeathStar({ radius: STATION_R, detail: 0.7, lit: true })
    : fallbackStation(STATION_R);
  group.add(station);
  station.rotation.y = 0.5;

  // The ignition point: on the equator, on the hemisphere facing the camera.
  const IGNITE = new THREE.Vector3(0.30, 0.0, 0.95).normalize();

  // --- pinprick, then a web of cracks racing outward from it
  const spark = glowSprite(0xfff0c8, 14, 0);
  spark.position.copy(IGNITE).multiplyScalar(STATION_R * 1.01);
  group.add(spark);
  const cracks = new CrackWeb(STATION_R, { origin: IGNITE, arcs: 13, steps: 30, seed: 11 });
  group.add(cracks.object);

  // --- the detonation itself
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), additiveMaterial(0xfff4d0, { opacity: 0 }));
  core.position.copy(IGNITE).multiplyScalar(STATION_R * 0.2);
  group.add(core);
  const halo = glowSprite(0xffd9a0, 1, 0);
  halo.position.copy(core.position);
  group.add(halo);
  const fireball = new Fireball({
    t0: T.BOOM,
    life: 4.0,
    radius: STATION_R * 0.8,
    color: 0xffa940,
    position: core.position.toArray(),
  });
  group.add(fireball.object);
  // A hard light inside the blast, so the bricks nearest the centre are lit
  // from within while the fire lasts.
  const blastLight = new THREE.PointLight(0xffd8a0, 0, STATION_R * 12, 1.0);
  group.add(blastLight);
  // Embers riding out with the bricks: fire distributed through the cloud, not
  // just a ball behind it.
  const embers = new Sparks({
    count: 900,
    t0: T.BOOM,
    life: 9.4,
    speed: 74,
    gravity: 0,
    color: 0xffa858,
    size: 22,
    seed: 29,
    origin: core.position.toArray(),
  });
  group.add(embers.points);
  // ...and a long, slow warm glow at the middle of it, so the cloud never goes
  // completely cold while we are still holding on it.
  const afterglow = glowSprite(0xff9a44, STATION_R * 2.4, 0);
  afterglow.position.copy(core.position);
  group.add(afterglow);

  // --- the shockwave: a hard thin hoop in the plane of the trench with a
  // softer, fatter one lagging behind it. Two radii is what makes it read as a
  // pressure wave rather than as a hoop of string.
  const rings = [];
  for (const [tilt, spin, tube, alpha] of [
    [0, 0, 0.006, 1.0],
    [0.34, 0.7, 0.022, 0.34],
  ]) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1, tube, 8, 128),
      additiveMaterial(0xfff0c8, { opacity: 0 })
    );
    m.rotation.set(Math.PI / 2 + tilt, spin, 0);
    m.renderOrder = 9;
    m.userData.alpha = alpha;
    group.add(m);
    rings.push(m);
  }

  // --- four thousand bricks. The station mesh is switched off the instant this
  // takes over, so the two never pay for each other's triangles.
  const BRICKS = 4200;
  const burst = new BrickBurst(stationBricks(STATION_R, BRICKS, 7), {
    t0: T.BOOM,
    origin: new THREE.Vector3(),
    speed: 62,
    spin: 2.2,
    gravity: 0,
    spread: 0.5,
    radial: 1,
    max: BRICKS,
    seed: 13,
    stagger: 0.1,
  });
  burst.material.roughness = 0.5;
  group.add(burst.object);
  // A tenth of them come out still burning. One extra instanced mesh, and it is
  // the difference between a cloud of gravel and a station that just exploded.
  const HOT = 460;
  const hot = new BrickBurst(stationBricks(STATION_R, HOT, 19), {
    t0: T.BOOM,
    origin: new THREE.Vector3(),
    speed: 66,
    spin: 3.0,
    gravity: 0,
    spread: 0.6,
    radial: 1,
    max: HOT,
    seed: 31,
    stagger: 0.1,
    colorOverride: 0x3c1c08,
  });
  hot.material.emissive = new THREE.Color(0xff8a34);
  hot.material.roughness = 0.6;
  group.add(hot.object);

  // --- the fighters getting clear, silhouetted against it
  const escapes = [];
  const engines = new EngineGlow(12, KIT.engineBlue, 0.3);
  group.add(engines.object);
  const proto = collapse(await fighters.buildXWing({ sfoils: 1 }), 0.85, 0.5);
  const enginePoints = [];
  {
    const src = await fighters.buildXWing({ sfoils: 1 });
    for (const p of src.userData.enginePoints) enginePoints.push(p.clone());
  }
  for (let i = 0; i < 3; i++) {
    const ship = i === 0 ? proto : cloneCollapsed(proto);
    ship.userData.slot = [(i - 1) * 26 + hash11(i, 17) * 8, (i - 1) * 9, -i * 34];
    group.add(ship);
    escapes.push(ship);
  }
  // They come from just off the station and pass wide of the lens.
  const ESCAPE = [
    [120, 40, 300],
    [190, 96, 620],
    [250, 150, 900],
    [300, 205, 1180],
  ];

  const p = new THREE.Vector3();
  const wp = new THREE.Vector3();
  const aim = new THREE.Vector3();

  return {
    group,

    /**
     * One long wide shot, easing back for the rest of the scene so the growing
     * cloud stays framed. The pull-back is also what makes the cloud look like
     * it is settling: the bricks themselves never slow down.
     */
    rig(t, camera) {
      const u = ease.range(t, T.SPACE, 54);
      const dist = ease.lerp(730, 1440, ease.smooth(ease.range(t, T.BOOM, 52.5)));
      const az = 0.16 + u * 0.12;
      const el = 0.2 + 0.05 * Math.sin(u * 2.1);
      camera.position.set(
        Math.sin(az) * Math.cos(el) * dist,
        Math.sin(el) * dist,
        Math.cos(az) * Math.cos(el) * dist
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      setFov(camera, ease.track([[T.SPACE, 27], [T.CRACK, 25], [T.BOOM, 24], [T.BOOM + 1.4, 33], [54, 38]], t));
      // A jolt on the detonation, then a long slow settle.
      const jolt = ease.pulse(t, T.BOOM, 0.05, 0.1, 2.6);
      if (jolt > 0.001) {
        const n = (k) => Math.sin(t * 27 * (1 + k * 0.2) + k * 5.1) * Math.sin(t * 11 + k);
        camera.position.x += n(1) * 24 * jolt;
        camera.position.y += n(2) * 24 * jolt;
        camera.rotation.z += n(3) * 0.03 * jolt;
      }
    },

    update(t) {
      stars.update(t);
      station.rotation.y = 0.5 + t * 0.006;
      station.visible = t < T.BOOM;

      // --- the pinprick and the cracks
      const glow = ease.range(t, T.SPACE + 0.5, T.CRACK);
      spark.material.opacity = (0.25 + 0.75 * glow) * glow * (0.7 + 0.3 * Math.sin(t * 9)) * (t < T.BOOM ? 1 : 0);
      spark.scale.setScalar(14 * (0.4 + 2.6 * glow));
      cracks.update(t);

      // --- the detonation. The core has to get out of the way fast: hold it
      // any longer and it is just a white screen where the bricks should be.
      const boom = ease.range(t, T.BOOM, T.BOOM + 1.5);
      core.visible = t >= T.BOOM - 0.06 && boom < 1;
      if (core.visible) {
        const r = STATION_R * ease.lerp(0.1, 1.9, ease.outQuint(boom));
        core.scale.setScalar(r);
        core.material.opacity = 1.1 * Math.pow(1 - boom, 2.2);
        halo.visible = true;
        halo.scale.setScalar(r * 2.6);
        halo.material.opacity = 0.9 * Math.pow(1 - boom, 1.8);
      } else {
        halo.visible = false;
      }
      fireball.update(t);
      embers.update(t);
      blastLight.intensity = 44 * Math.pow(1 - ease.range(t, T.BOOM, T.BOOM + 5.0), 1.6);

      // Rings: fast, thin, and gone. Two radii so it does not read as one hoop.
      for (let i = 0; i < rings.length; i++) {
        const w = ease.range(t, T.BOOM + i * 0.22, T.BOOM + 3.0 + i * 0.8);
        rings[i].visible = w > 0 && w < 1;
        if (!rings[i].visible) continue;
        const r = STATION_R * ease.lerp(0.4, 10 - i * 3.2, ease.outQuad(w));
        rings[i].scale.set(r, r, r);
        rings[i].material.opacity = rings[i].userData.alpha * Math.pow(1 - w, 1.3);
      }

      // --- the bricks, and the ones still burning
      burst.object.visible = t >= T.BOOM;
      if (burst.object.visible) burst.update(t);
      hot.object.visible = t >= T.BOOM;
      if (hot.object.visible) {
        hot.update(t);
        hot.material.emissiveIntensity = 2.2 * Math.pow(1 - ease.range(t, T.BOOM, 53.5), 1.4);
      }
      const warmth = 1 - ease.range(t, T.BOOM + 0.4, 52.5);
      afterglow.material.opacity = 0.5 * Math.pow(warmth, 1.7);
      afterglow.scale.setScalar(STATION_R * (1.6 + 2.6 * ease.range(t, T.BOOM, 50)));

      // --- the fighters
      const u = ease.range(t, T.SPACE, 54);
      p.set(...ease.spline(ESCAPE, u));
      aim.set(...ease.spline(ESCAPE, Math.min(1, u + 0.03)));
      let n = 0;
      for (let i = 0; i < escapes.length; i++) {
        const ship = escapes[i];
        const [ox, oy, oz] = ship.userData.slot;
        ship.position.set(p.x + ox, p.y + oy + Math.sin(t * 0.8 + i) * 3, p.z + oz);
        ship.lookAt(aim.x + ox, aim.y + oy, aim.z + oz);
        ship.updateMatrixWorld();
        for (const q of enginePoints) {
          wp.copy(q).applyMatrix4(ship.matrixWorld);
          if (engines.set(n, wp, ship.quaternion, 0.6, 8, 0.95, t)) n++;
        }
      }
      engines.flush(n);
    },
  };
}

/**
 * A spreading web of light. Each arc is a great circle leaving the ignition
 * point; the instances along it pop into existence in order, which reads as a
 * crack tearing across the hull. Nothing here integrates: an instance's scale
 * is a function of t and its own position along its arc.
 */
class CrackWeb {
  constructor(R, { origin, arcs = 12, steps = 28, color = 0xffdf9e, seed = 5 } = {}) {
    this.R = R;
    this.steps = steps;
    this.arcs = arcs;
    // A tangent basis at the ignition point, so every arc starts there.
    const n = origin.clone().normalize();
    const t1 = new THREE.Vector3(0, 1, 0);
    if (Math.abs(n.y) > 0.9) t1.set(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(n, t1).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();

    const total = arcs * steps;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, additiveMaterial(color, { opacity: 0.9 }), total);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.object = this.mesh;

    this.items = [];
    const q = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let a = 0; a < arcs; a++) {
      // Direction the crack leaves in, plus how far round it gets.
      const phi = (a / arcs) * Math.PI * 2 + hash11(a, seed) * 0.4;
      const dir = u.clone().multiplyScalar(Math.cos(phi)).add(v.clone().multiplyScalar(Math.sin(phi)));
      const reach = (0.55 + hash11(a, seed + 1) * 0.85) * Math.PI;
      const delay = hash11(a, seed + 2) * 1.05;
      const wobble = (hash11(a, seed + 3) - 0.5) * 0.55;
      for (let s = 0; s < steps; s++) {
        const f = (s + 0.5) / steps;
        const th = f * reach;
        // Let the arc wander off its great circle so the web is not a starburst.
        const bend = wobble * Math.sin(f * 3.1);
        const d = dir.clone().multiplyScalar(Math.cos(bend)).add(n.clone().cross(dir).multiplyScalar(Math.sin(bend)));
        nrm.copy(n).multiplyScalar(Math.cos(th)).add(d.multiplyScalar(Math.sin(th))).normalize();
        pos.copy(nrm).multiplyScalar(R * 1.004);
        tan.copy(n).multiplyScalar(-Math.sin(th)).add(d.multiplyScalar(Math.cos(th))).normalize();
        side.crossVectors(nrm, tan).normalize();
        m.makeBasis(side, nrm, tan);
        q.setFromRotationMatrix(m);
        this.items.push({
          p: pos.clone(),
          q: q.clone(),
          len: (reach / steps) * R * 1.35,
          w: 0.7 + hash11(a * steps + s, seed + 4) * 2.4,
          t: delay + f * (1.5 + hash11(a, seed + 5) * 0.9),
        });
      }
    }
    this._d = new THREE.Object3D();
  }

  update(t) {
    const on = t >= T.CRACK - 0.4 && t < T.BOOM + 0.25;
    this.mesh.visible = on;
    if (!on) return;
    const local = t - T.CRACK;
    const swell = 1 + 5 * ease.range(t, T.BOOM - 0.45, T.BOOM + 0.1);
    const d = this._d;
    let n = 0;
    for (const it of this.items) {
      const a = ease.range(local, it.t, it.t + 0.18);
      if (a <= 0) continue;
      d.position.copy(it.p);
      d.quaternion.copy(it.q);
      d.scale.set(it.w * a * swell, 0.5 * a * swell, it.len);
      d.updateMatrix();
      this.mesh.setMatrixAt(n, d.matrix);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.material.opacity = 0.85 * Math.min(1, ease.range(t, T.CRACK - 0.3, T.CRACK + 0.4) + 0.15);
  }
}

/**
 * Four thousand plausible bricks filling the station's shell, ready to be
 * thrown outward. Building the list ourselves rather than reusing the model's
 * own part list lets the count and the size distribution be chosen for the shot.
 */
function stationBricks(R, n, seed) {
  const greys = [
    COLORS.lightBluishGray,
    COLORS.darkBluishGray,
    COLORS.flatSilver,
    COLORS.white,
    COLORS.black,
    COLORS.lightBluishGray,
  ];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const parts = [];
  const e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const sy = 1 - ((i + 0.5) / n) * 2;
    const lat = Math.asin(Math.max(-1, Math.min(1, sy * 0.999)));
    const lon = i * golden;
    // Nearly all of a battle station's brick count is plating, so keep the mass
    // in a thick shell. Filling the volume evenly just reads as a ball of
    // gravel once it is moving.
    const depth = 0.68 + 0.32 * Math.pow(hash11(i, seed * 3 + 1), 0.4);
    const r = R * depth;
    const dir = new THREE.Vector3(
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
      Math.cos(lat) * Math.cos(lon)
    );
    e.set(hash11(i, seed * 3 + 2) * 6.28, hash11(i, seed * 3 + 3) * 6.28, hash11(i, seed * 3 + 4) * 6.28);
    parts.push({
      position: dir.multiplyScalar(r),
      quaternion: new THREE.Quaternion().setFromEuler(e),
      // Chunks of a hundred-and-fifty-unit sphere, sized so that an individual
      // brick is still a recognisable brick at the camera's standoff. A tenth of
      // them are big slabs, which is what gives the cloud a sense of scale.
      size: hash11(i, seed * 3 + 9) > 0.9
        ? new THREE.Vector3(
            22 + hash11(i, seed * 3 + 5) * 26,
            5 + hash11(i, seed * 3 + 6) * 6,
            18 + hash11(i, seed * 3 + 7) * 24
          )
        : new THREE.Vector3(
            6 + hash11(i, seed * 3 + 5) * 15,
            3 + hash11(i, seed * 3 + 6) * 6,
            6 + hash11(i, seed * 3 + 7) * 14
          ),
      color: greys[Math.floor(hash11(i, seed * 3 + 8) * greys.length) % greys.length],
    });
  }
  return parts;
}

/** Stand-in battle station, if `ships-capital.js` has not landed. */
function fallbackStation(R) {
  const b = new Bricks({ studSegments: 6 });
  const hull = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const opts = { studs: false };
  b.addGeometry(new THREE.SphereGeometry(R, 60, 38), { color: hull, opts });
  b.addGeometry(new THREE.CylinderGeometry(R * 0.999, R * 0.999, R * 0.07, 60, 1, true), {
    color: COLORS.trueBlack,
    opts: { studs: false, side: THREE.DoubleSide },
  });
  for (let i = 0; i < 500; i++) {
    const uy = hash11(i, 41) * 2 - 1;
    const th = hash11(i, 42) * Math.PI * 2;
    if (Math.abs(uy) < 0.05) continue;
    const rr = Math.sqrt(1 - uy * uy);
    const nrm = new THREE.Vector3(Math.cos(th) * rr, uy, Math.sin(th) * rr);
    const s = R * (0.02 + hash11(i, 43) * 0.05);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    const eu = new THREE.Euler().setFromQuaternion(q);
    b.push();
    b.translateWorld(nrm.x * R * 0.993, nrm.y * R * 0.993, nrm.z * R * 0.993);
    b.addGeometry(new THREE.BoxGeometry(s * 2, R * 0.016, s * 1.4), {
      rot: [eu.x, eu.y, eu.z],
      color: hash11(i, 47) > 0.68 ? dark : hull,
      opts,
    });
    b.pop();
  }
  const model = b.build({ castShadow: false, receiveShadow: false });
  model.userData.trenchY = 0;
  return model;
}

// ===========================================================================
// Shared helpers
// ===========================================================================

function setFov(camera, fov) {
  if (Math.abs(camera.fov - fov) > 1e-4) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

/**
 * Merge every mesh under `root` into one vertex-coloured mesh per blend class.
 *
 * A kit fighter is a couple of dozen draw calls; five sections of trench and
 * three X-wings at that rate would not fit in the budget. Baking each
 * material's colour into a vertex attribute collapses each model to three:
 * hull, glow and glass. `glowTint` pulls baked emissives back down — a part
 * authored at emissive intensity 2.2 becomes flat white otherwise.
 */
function collapse(root, tint = 1, glowTint = 1) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const c = new THREE.Color();
  const buckets = { solid: [], glow: [], glass: [] };

  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const m = node.material;
    const g = (node.geometry.index ? node.geometry.toNonIndexed() : node.geometry).clone();
    g.applyMatrix4(local.multiplyMatrices(inv, node.matrixWorld));
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();

    const emissive = m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0x000000;
    if (emissive) c.copy(m.emissive).multiplyScalar(Math.min(1.8, m.emissiveIntensity ?? 1) * glowTint);
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
  const add = (geos, material) => {
    if (!geos.length) return;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    out.add(mesh);
  };
  add(buckets.solid, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.44, metalness: 0.04 }));
  add(buckets.glow, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  add(
    buckets.glass,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, transparent: true, opacity: 0.6 })
  );
  out.userData.parts = root.userData.parts;
  return out;
}

/**
 * Collapse an articulated model without flattening its joints: each direct
 * child of the root (the hull, and one group per S-foil pivot) is merged in
 * place, so `userData.setSFoils` still drives real transforms afterwards.
 */
function collapseArticulated(root, tint = 1, glowTint = 1) {
  for (const child of root.children) {
    if (!child.children.length) continue;
    const flat = collapse(child, tint, glowTint);
    child.clear();
    for (const mesh of [...flat.children]) child.add(mesh);
  }
  return root;
}

/** Share a collapsed model's geometry across another instance of it. */
function cloneCollapsed(model) {
  const g = new THREE.Group();
  for (const child of model.children) g.add(new THREE.Mesh(child.geometry, child.material));
  g.userData.parts = model.userData.parts;
  return g;
}

/**
 * Every engine flare in the scene as two instanced meshes: an additive cone for
 * the plume and a hot core.
 */
class EngineGlow {
  constructor(max, color, opacity = 0.4) {
    const cone = new THREE.ConeGeometry(1, 1, 16, 1, true);
    cone.translate(0, -0.5, 0);
    cone.rotateX(Math.PI / 2); // apex at the nozzle, base trailing along -z
    this.plume = new THREE.InstancedMesh(cone, additiveMaterial(color, { opacity }), max);
    // A small, hot centre: without it the cone reads as a solid pale wedge stuck
    // on the back of the ship rather than as something burning.
    this.core = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      additiveMaterial(0xeafbff, { opacity: Math.min(1, opacity * 3.2) }),
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
  /** Returns false for a cold engine so the caller can skip the slot entirely. */
  set(i, position, quaternion, radius, length, throttle, t) {
    if (throttle <= 0.02) return false;
    const f = throttle * (0.88 + 0.12 * Math.sin(t * 41 + i * 2.3) * Math.sin(t * 17 + i));
    const d = this._d;
    d.position.copy(position);
    d.quaternion.copy(quaternion);
    const r = radius * (0.5 + f * 0.42);
    d.scale.set(r, r, Math.max(0.001, length * f));
    d.updateMatrix();
    this.plume.setMatrixAt(i, d.matrix);
    d.scale.setScalar(radius * (0.14 + f * 0.28));
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
