/**
 * Console hooks for driving a strike without playing the game up to five kills.
 *
 * Installed only under `?killstreaktest=1`, so a shipping page has nothing on
 * `window` that can fire ordnance. The screenshot harness in `Capture.mjs` drives
 * exactly these: `__STRIKE__` to start a run, `__KS_STATE__` to know where the
 * sequence has got to, `__KS_CAM__` to point a camera at the part of it worth
 * photographing, and `__KS_MODEL__` to hang one airframe in clear sky.
 */
import * as THREE from 'three';
import type { EngineContext } from '../../core/System';
import type { PhysicsSystem, PlayerSystem, WorldSystem } from '../../core/Contracts';
import type { KillstreakId } from '../../core/Contracts';
import type { KillstreakSystemImpl } from '../index';
import { bearingToDirection, normalizeBearing } from '../MapMath';
import { DebugCamera, type DebugCameraSettings } from './DebugCamera';

export interface StrikeTestOptions {
  /** Landmark name to aim at. Defaults to one near the middle of the map. */
  landmark?: string;
  /** Metres from the target the observer stands. */
  standoff?: number;
  /** Compass bearing the aircraft run in from, radians. */
  heading?: number;
  /** Skip moving the player. */
  keepPosition?: boolean;
  /** Leave the viewmodel up. Off by default: it eats a quarter of the frame. */
  keepViewmodel?: boolean;
}

interface StrikeTestResult {
  kind: string;
  target: { x: number; y: number; z: number };
  heading: number;
  landmark: string;
  observer: { x: number; y: number; z: number };
}

type Hooked = Record<string, unknown>;

const KEYS = [
  '__STRIKE__',
  '__KS_STATE__',
  '__KS_VIEW__',
  '__KS_CAM__',
  '__KS_GIVE__',
  '__KS_MODEL__',
  '__KS__',
] as const;

/**
 * Camera presets the harness names instead of computing world positions.
 *
 * They are biased toward framings that hold the horizon near the top of the
 * frame, and that is a rendering-cost decision as much as a compositional one:
 * the cloud deck is a per-pixel raymarch, so a frame that is mostly sky costs
 * several times one that is mostly ground. In software rendering that is the
 * difference between a six second frame and a three minute one.
 */
export type CameraPreset = 'off' | 'stand' | 'tele' | 'chase' | 'high';

/** The model currently parked in the air for inspection. */
let inspecting: { root: THREE.Object3D; dispose: () => void } | null = null;
let installed = false;

const camera = new DebugCamera();

/** Last staged geometry, so a camera preset can be named rather than computed. */
const stageState = {
  target: new THREE.Vector3(),
  observer: new THREE.Vector3(),
  /** Run-in axis: the direction the aircraft travel. */
  direction: new THREE.Vector3(0, 0, 1),
  right: new THREE.Vector3(1, 0, 0),
  heading: 0,
};

export function installDebugHooks(system: KillstreakSystemImpl, ctx: EngineContext): void {
  if (typeof window === 'undefined') return;
  const flag = new URLSearchParams(window.location.search).get('killstreaktest');
  if (!flag || flag === '0') return;

  const target = window as unknown as Hooked;
  installed = true;
  target.__KS__ = system;
  target.__KS_STATE__ = (): Record<string, unknown> => ({
    ...system.diagnostics,
    camera: { mode: camera.mode, subject: camera.subject, locked: camera.locked },
  });
  target.__KS_GIVE__ = (id: KillstreakId): void => system.give(id, true);
  target.__KS_VIEW__ = (options?: StrikeTestOptions): StrikeTestResult =>
    stage(system, ctx, options ?? {}, null);
  target.__STRIKE__ = (
    kind: 'carpet' | 'cluster' | 'precision' = 'carpet',
    options?: StrikeTestOptions,
  ): StrikeTestResult => stage(system, ctx, options ?? {}, kind);
  target.__KS_CAM__ = (preset: CameraPreset, overrides?: DebugCameraSettings): string | null =>
    setCamera(ctx, preset, overrides);
  target.__KS_MODEL__ = (name: string | null, distance = 26): boolean =>
    inspect(system, ctx, name, distance);

  console.info('[killstreaks] debug hooks installed: __STRIKE__(kind), __KS_CAM__(preset)');
}

export function removeDebugHooks(): void {
  if (typeof window === 'undefined') return;
  inspecting?.dispose();
  inspecting = null;
  installed = false;
  camera.mode = 'off';
  const target = window as unknown as Hooked;
  for (const key of KEYS) delete target[key];
}

/** Called from the system's `lateUpdate`, after the player has written the camera. */
export function updateDebugCamera(ctx: EngineContext): void {
  if (!installed) return;
  camera.apply(ctx);
}

// ---------------------------------------------------------------------------
// Camera presets
// ---------------------------------------------------------------------------

function setCamera(
  ctx: EngineContext,
  preset: CameraPreset,
  overrides?: DebugCameraSettings,
): string | null {
  const { target, observer, direction, right } = stageState;
  const eye = new THREE.Vector3();

  switch (preset) {
    case 'off':
      camera.release(ctx);
      return null;

    // The player's own stand, looking at whatever is in the air. This is the shot
    // that answers "what does the strike look like from the ground". Sixty degrees
    // rather than the player's seventy-five: the top fifteen are empty sky, and
    // sky is the most expensive thing this renderer draws.
    case 'stand':
      camera.configure({
        mode: 'stand',
        eye: observer.toArray(),
        aim: [target.x, target.y + 2, target.z],
        subject: 'auto',
        aimLift: 0,
        fov: 60,
      });
      break;

    // The same stand through a long lens. Three aircraft at 700 m are twelve
    // pixels across at 75 degrees and fifty at 18, and fifty is the difference
    // between "specks" and "aircraft".
    case 'tele':
      camera.configure({
        mode: 'stand',
        eye: observer.toArray(),
        aim: [target.x, target.y + 2, target.z],
        subject: 'auto',
        fov: 18,
      });
      break;

    // On the formation's port quarter and slightly below it, which is where a
    // photo-chase aircraft sits and the only place a wing planform, a loaded pylon
    // and clear sky behind are all available at once. Above the formation the
    // background is 150 m of brown terrain and the airframe disappears into it.
    case 'chase':
      camera.configure({
        mode: 'chase',
        subject: 'ks:strikeJet',
        offset: [-30, -11, -14],
        local: true,
        aimLift: 0,
        fov: 42,
      });
      break;

    // Forty-four metres up on the flank, looking down the axis at 26 degrees: the
    // only viewpoint from which a 96 m walked line reads as a line rather than as
    // one explosion after another. Ninety metres out rather than a hundred and
    // forty, because a 14 m fireball at 140 m is a spark. Any higher and the frame
    // fills with sky, which in this renderer costs six times as much to draw.
    case 'high':
      eye
        .copy(target)
        .addScaledVector(right, 78)
        .addScaledVector(direction, -22);
      eye.y = target.y + 44;
      camera.configure({
        mode: 'stand',
        eye: eye.toArray(),
        aim: [target.x, target.y + 4, target.z],
        subject: 'none',
        fov: 58,
      });
      break;

    default:
      return null;
  }

  if (overrides) camera.configure(overrides);
  return camera.mode === 'off' ? null : preset;
}

// ---------------------------------------------------------------------------
// Model inspection
// ---------------------------------------------------------------------------

/**
 * Hangs one model in clear sky and points a ground camera at it.
 *
 * The camera stays at eye height on purpose. Lifting it to the model's altitude
 * puts the whole map inside the view frustum, which defeats the world's culling
 * and makes the shadow cascades fit the horizon — at software frame rates that is
 * the difference between a one second frame and a three minute one. Thirty-four
 * degrees of elevation clears every roofline on this map while leaving the camera
 * standing on the ground where the renderer expects it.
 */
const INSPECT_ELEVATION = 34 * (Math.PI / 180);

function inspect(
  system: KillstreakSystemImpl,
  ctx: EngineContext,
  name: string | null,
  distance: number,
): boolean {
  inspecting?.dispose();
  inspecting = null;
  if (!name) {
    camera.release(ctx);
    return true;
  }

  const model = system.createDebugModel(name);
  if (!model) return false;

  const player = ctx.tryGet<PlayerSystem>('player');
  const physics = ctx.tryGet<PhysicsSystem>('physics');
  const eye = new THREE.Vector3();
  if (player) player.getEyePosition(eye);
  else eye.copy(ctx.camera.position);

  const horizontal = Math.cos(INSPECT_ELEVATION) * distance;
  const lift = Math.sin(INSPECT_ELEVATION) * distance;
  const place = new THREE.Vector3();
  const chosen = new THREE.Vector3();
  let bestAzimuth = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < 12; i++) {
    const azimuth = (i / 12) * Math.PI * 2;
    place.set(
      eye.x + Math.sin(azimuth) * horizontal,
      eye.y + lift,
      eye.z + Math.cos(azimuth) * horizontal,
    );
    let score = 0;
    if (physics?.ready) {
      if (!physics.lineOfSight(eye, place)) continue;
      // A second probe twice as far out: clear sight of the model is not enough
      // if there is a water tower directly behind it.
      const beyond = place.clone().sub(eye).multiplyScalar(2).add(eye);
      if (physics.lineOfSight(eye, beyond)) score += 10;
    }
    if (score <= bestScore) continue;
    bestScore = score;
    bestAzimuth = azimuth;
    chosen.copy(place);
  }
  if (bestScore === -Infinity) chosen.set(eye.x, eye.y + lift, eye.z + horizontal);

  // Three-quarter view: the nose swung 43 degrees off the line of sight is the
  // angle that shows span and length at once.
  model.root.position.copy(chosen);
  model.root.rotation.set(0, bestAzimuth + Math.PI - 0.75, 0);
  model.root.visible = true;
  ctx.scene.add(model.root);
  model.root.updateMatrixWorld(true);
  inspecting = model;

  camera.configure({
    mode: 'stand',
    eye: eye.toArray(),
    aim: chosen.toArray(),
    subject: 'none',
    fov: 38,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

/**
 * Places the observer and, if a kind is given, calls the strike. Split so the
 * harness can frame a shot, wait for the renderer to settle, and only then start
 * the sequence.
 */
function stage(
  system: KillstreakSystemImpl,
  ctx: EngineContext,
  options: StrikeTestOptions,
  kind: 'carpet' | 'cluster' | 'precision' | null,
): StrikeTestResult {
  const world = ctx.tryGet<WorldSystem>('world');
  const player = ctx.tryGet<PlayerSystem>('player');
  const point = new THREE.Vector3();
  const centre = new THREE.Vector3();
  world?.bounds.getCenter(centre);

  const landmarks = world?.getLandmarks();
  let name = 'map centre';
  point.copy(centre);
  if (landmarks && landmarks.size > 0) {
    if (options.landmark && landmarks.has(options.landmark)) {
      name = options.landmark;
      point.copy(landmarks.get(options.landmark) as THREE.Vector3);
    } else {
      // Nearest landmark to the middle of the map: the most likely to have open
      // ground around it and the least likely to put the carpet through a wall.
      let best = Infinity;
      for (const [key, position] of landmarks) {
        const d = position.distanceToSquared(centre);
        if (d >= best) continue;
        best = d;
        name = key;
        point.copy(position);
      }
    }
  }
  point.y = world?.sampleGround(point.x, point.z) ?? point.y;

  const standoff = options.standoff ?? 96;
  const heading = normalizeBearing(options.heading ?? Math.PI * 0.5);

  // Downrange of the target and nearly on the run-in axis. The aircraft then fly
  // straight at the camera and pass overhead, and the carpet walks toward the
  // viewer rather than away, which is the read the sequence is authored for. Far
  // enough back that the near end of a 96 m carpet is not danger close.
  const observer = placeObserver(ctx, point, heading, standoff);

  stageState.target.copy(point);
  stageState.observer.set(observer.x, observer.y + 1.65, observer.z);
  stageState.heading = heading;
  bearingToDirection(heading, stageState.direction).multiplyScalar(-1);
  stageState.right.set(-stageState.direction.z, 0, stageState.direction.x);

  if (!options.keepPosition && player) {
    // Player yaw is measured so that the look direction is (-sin, 0, -cos).
    const toTarget = Math.atan2(observer.x - point.x, observer.z - point.z);
    player.teleport(observer, toTarget);
  }
  if (!options.keepViewmodel) ctx.viewScene.visible = false;

  if (kind) system.callAirStrike(point, heading, kind);

  return {
    kind: kind ?? 'none',
    target: { x: point.x, y: point.y, z: point.z },
    heading,
    landmark: name,
    observer: { x: observer.x, y: observer.y, z: observer.z },
  };
}

/**
 * Points on the run-in the stand has to be able to see, as [metres upstream of
 * the target, metres above the ground, weight].
 *
 * These are not generic sky probes — they are where the formation actually is at
 * 1, 2 and 3 seconds out, plus the impact point and the overhead pass. Probing
 * generic elevations *toward the target* is what put the last two attempts behind
 * a warehouse: from a stand fifty degrees off the axis, the target and the
 * approach corridor are in completely different directions, and only one of them
 * has aircraft in it.
 *
 * The weights are large enough to dominate the placement term. A stand twenty
 * metres off the ideal with a clear corridor beats a perfectly placed one facing
 * a roofline, and the numbers have to say so.
 */
const CORRIDOR_PROBES: ReadonlyArray<[number, number, number]> = [
  [0, 2, 60],
  [140, 150, 70],
  [340, 150, 60],
  [640, 150, 40],
  [-90, 170, 25],
];

/**
 * Finds an open stand downrange of the target: line of sight to the impact point
 * and, more importantly, to the piece of sky the formation flies down.
 */
function placeObserver(
  ctx: EngineContext,
  target: THREE.Vector3,
  heading: number,
  standoff: number,
): THREE.Vector3 {
  const world = ctx.tryGet<WorldSystem>('world');
  const physics = ctx.tryGet<PhysicsSystem>('physics');
  const from = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const best = new THREE.Vector3();
  let bestScore = -Infinity;

  // Upstream: the way the aircraft come from, which is the bearing itself.
  const upstream = bearingToDirection(heading, new THREE.Vector3());

  for (const distance of [standoff, standoff * 1.25, standoff * 0.8, standoff * 1.5, standoff * 1.9]) {
    for (const spread of [0, 12, -12, 24, -24, 38, -38, 54, -54]) {
      // The aircraft fly from `heading` toward the target, so downrange is that
      // bearing reflected: stand where the formation is going.
      const bearing = normalizeBearing(heading + Math.PI + (spread * Math.PI) / 180);
      bearingToDirection(bearing, offset).multiplyScalar(distance);
      from.set(target.x + offset.x, 0, target.z + offset.z);
      const ground = world?.sampleGround(from.x, from.z);
      if (ground === null || ground === undefined) continue;
      from.y = ground + 1.65;

      let score = 100 - Math.abs(spread) * 0.4 - Math.abs(distance - standoff) * 0.25;
      if (physics?.ready) {
        for (const [upRange, altitude, weight] of CORRIDOR_PROBES) {
          probe
            .copy(target)
            .addScaledVector(upstream, upRange)
            .setY(target.y + altitude);
          if (physics.lineOfSight(from, probe)) score += weight;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best.copy(from);
      }
    }
  }
  if (bestScore === -Infinity) {
    best.set(target.x, target.y + 1.65, target.z - standoff);
  }
  // `teleport` takes a feet position; the search worked at eye height.
  best.y -= 1.65;
  return best;
}
