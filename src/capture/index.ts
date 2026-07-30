/**
 * Scripted capture states for automated visual review.
 *
 * Installed only under `?capture=1`. Exposes `window.__SHOT__(name)`, which
 * poses the game into a named state and resolves once the renderer has
 * converged, so a screenshot taken immediately afterwards is stable rather than
 * catching a half-accumulated TAA history or a particle system on frame one.
 *
 * The reason this lives outside every gameplay module is that a shot is a
 * cross-cutting concern: a single frame may need the player moved, a weapon
 * equipped and aimed, enemies spawned, an airstrike mid-flight and the HUD
 * populated. Doing that from inside any one module would invert its
 * dependencies.
 */
import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import type {
  AISystem,
  CombatSystem,
  FXSystem,
  KillstreakSystem,
  PhysicsSystem,
  PlayerSystem,
  RenderSystem,
  UISystem,
  WeaponSystem,
  WorldSystem,
} from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import { angleDelta } from '../core/MathUtils';
import type { DamageInfo } from '../core/GameTypes';

/** Sky/weather controls that live on the render impl rather than the contract. */
interface SkyControls {
  setTimeOfDay?(t: number): void;
  setSunDirection?(v: THREE.Vector3): void;
}

/** Killstreak debug entry points, present only when its own flag is set. */
interface StrikeControls {
  callAirStrike(target: THREE.Vector3, heading: number, kind?: 'precision' | 'cluster' | 'carpet'): void;
}

export interface ShotDefinition {
  name: string;
  description: string;
  /** Pose the world. May await; the harness waits for convergence afterwards. */
  setup(c: ShotContext): void | Promise<void>;
  /** Extra frames to settle beyond the default, for slow-building effects. */
  settleFrames?: number;
}

export interface ShotContext {
  ctx: EngineContext;
  world: WorldSystem | undefined;
  player: PlayerSystem | undefined;
  weapons: WeaponSystem | undefined;
  ai: AISystem | undefined;
  combat: CombatSystem | undefined;
  fx: FXSystem | undefined;
  ui: UISystem | undefined;
  render: RenderSystem | undefined;
  killstreaks: KillstreakSystem | undefined;
  /** Landmark position by name, falling back to the map centre. */
  at(name: string, fallback?: THREE.Vector3): THREE.Vector3;
  /** An eye position that has a ceiling over it, or null if none was found. */
  findInterior(near: THREE.Vector3, searchRadius?: number): THREE.Vector3 | null;
  /** An eye standing off a real wall face, looking at it. */
  findWall(
    near: THREE.Vector3,
    searchRadius?: number,
  ): { eye: THREE.Vector3; target: THREE.Vector3 } | null;
  /** The direction from `eye` with the longest unobstructed sightline. */
  clearestDirection(
    eye: THREE.Vector3,
    opts?: { samples?: number; maxDistance?: number; preferYaw?: number },
  ): { direction: THREE.Vector3; distance: number };
  /** Pose at `eye` looking down the clearest lane. Returns that lane's length. */
  lookDownLane(eye: THREE.Vector3, preferYaw?: number): number;
  /** Put the eye at `from` looking at `to`. Handles the feet/eye offset. */
  look(from: THREE.Vector3, to: THREE.Vector3): void;
  /** Advance n rendered frames. */
  frames(n: number): Promise<void>;
  /** Hold simulation still so a transient effect can be photographed. */
  freeze(): void;
  resume(): void;
  /** Drop a ring of enemies around a point, returning how many spawned. */
  spawnEnemies(around: THREE.Vector3, count: number, radius: number): number;
}

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/**
 * Software rendering in CI produces roughly one frame per second, so anything
 * that waits on wall-clock time waits forever. Everything here counts frames.
 */
function makeContext(ctx: EngineContext): ShotContext {
  const world = ctx.tryGet<WorldSystem>('world');
  const scratch = new THREE.Vector3();

  const frames = (n: number): Promise<void> =>
    new Promise((resolve) => {
      let left = Math.max(1, n);
      const step = (): void => {
        if (--left <= 0) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

  const at = (name: string, fallback?: THREE.Vector3): THREE.Vector3 => {
    const found = world?.getLandmarks().get(name);
    if (found) return found.clone();
    if (fallback) return fallback.clone();
    // Fall back to any landmark before the origin, since the origin may be
    // inside a building and would photograph as a black frame.
    const first = world?.getLandmarks().values().next().value as THREE.Vector3 | undefined;
    return first ? first.clone() : V(0, 0, 0);
  };

  const look = (from: THREE.Vector3, to: THREE.Vector3): void => {
    const player = ctx.tryGet<PlayerSystem>('player');
    const eye = resolveEye(from);
    scratch.subVectors(to, eye);
    const yaw = Math.atan2(-scratch.x, -scratch.z);
    const pitch = Math.atan2(scratch.y, Math.hypot(scratch.x, scratch.z));
    // `teleport` takes the feet; callers think in eye height.
    const feet = eye.clone();
    feet.y -= GAMEPLAY.player.height + GAMEPLAY.player.eyeOffset;
    if (player) {
      player.teleport(feet, yaw, pitch);
    } else {
      ctx.camera.position.copy(eye);
      ctx.camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
  };

  /**
   * Snap a requested eye position onto the floor beneath it and reject one that
   * is buried in geometry. A shot whose camera ends up inside a wall photographs
   * as a solid black frame, which is indistinguishable from a rendering bug and
   * wasted a whole review pass the first time it happened.
   */
  const resolveEye = (requested: THREE.Vector3): THREE.Vector3 => {
    const eyeHeight = GAMEPLAY.player.height + GAMEPLAY.player.eyeOffset;
    const ground = world?.sampleGround(requested.x, requested.z);
    const eye = requested.clone();
    if (ground !== null && ground !== undefined) {
      // Honour a deliberately elevated request (a rooftop), otherwise sit on the
      // floor so the eye height is always plausible.
      if (requested.y < ground + eyeHeight - 0.35) eye.y = ground + eyeHeight;
    }
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    if (!physics?.ready || !isBuried(physics, eye)) return eye;

    // Detecting a buried camera and then shooting anyway just produces a black
    // frame that reads as a rendering bug. Walk outward for open space instead.
    for (let ring = 1; ring <= 5; ring++) {
      const r = ring * 1.6;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + ring * 0.26;
        const x = eye.x + Math.cos(a) * r;
        const z = eye.z + Math.sin(a) * r;
        const g = world?.sampleGround(x, z);
        if (g === null || g === undefined) continue;
        scratch.set(x, g + eyeHeight, z);
        if (!isBuried(physics, scratch)) {
          console.info(
            `[capture] eye was inside geometry; relocated ${r.toFixed(1)}m to ` +
              `${scratch.x.toFixed(1)},${scratch.y.toFixed(1)},${scratch.z.toFixed(1)}`,
          );
          return scratch.clone();
        }
      }
    }
    console.warn('[capture] eye is inside geometry and no clear spot was found nearby');
    return eye;
  };

  /** True when a capsule at `p` overlaps world geometry. */
  const isBuried = (physics: PhysicsSystem, p: THREE.Vector3): boolean => {
    // Probe in three directions: a single cast can miss a thin slab it starts
    // exactly on, and a camera in solid rock fails all three.
    let blocked = 0;
    for (const dir of BURIED_PROBES) {
      const hit = physics.raycast(p, dir, { maxDistance: 0.45 });
      if (hit) blocked++;
    }
    return blocked >= 3;
  };

  const spawnEnemies = (around: THREE.Vector3, count: number, radius: number): number => {
    const ai = ctx.tryGet<AISystem>('ai');
    if (!ai) return 0;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.4;
      const x = around.x + Math.cos(angle) * radius;
      const z = around.z + Math.sin(angle) * radius;
      const y = world?.sampleGround(x, z);
      if (y === null || y === undefined) continue;
      if (ai.spawnEnemy(V(x, y, z), angle + Math.PI)) spawned++;
    }
    return spawned;
  };

  /**
   * Find a spot with a roof over it, by sampling near a landmark and keeping the
   * first position that has both floor below and geometry above. Hardcoding an
   * interior coordinate is brittle — the level is procedurally assembled, so a
   * layout change silently moves the camera outdoors, which is exactly what
   * happened to the first interior shot.
   */
  const findInterior = (near: THREE.Vector3, searchRadius = 14): THREE.Vector3 | null => {
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    if (!physics?.ready) return null;
    const eyeHeight = GAMEPLAY.player.height + GAMEPLAY.player.eyeOffset;
    for (let ring = 0; ring <= 3; ring++) {
      const r = (ring / 3) * searchRadius;
      const steps = ring === 0 ? 1 : 10;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = near.x + Math.cos(a) * r;
        const z = near.z + Math.sin(a) * r;
        const ground = world?.sampleGround(x, z);
        if (ground === null || ground === undefined) continue;
        scratch.set(x, ground + eyeHeight, z);
        const above = physics.raycast(scratch, UP, { maxDistance: 8 });
        // A ceiling, not the underside of a distant walkway.
        if (!above || above.distance <= 0.6 || above.distance >= 6) continue;
        // And enclosed on most sides. Without this the search settles in an
        // open arcade bay, which has a ceiling but is a threshold rather than a
        // room, and the interior shot then shows neither furniture nor a wall.
        let walls = 0;
        for (const dir of BURIED_PROBES) {
          if (dir.y !== 0) continue;
          if (physics.raycast(scratch, dir, { maxDistance: 7 })) walls++;
        }
        if (walls >= 3) return scratch.clone();
      }
    }
    return null;
  };

  /**
   * Locate a wall face near `near` and return an eye standing 1.1m off it at
   * eye height, looking straight at it. Sweeping for real geometry means the
   * shot keeps framing a material even when the procedural layout moves.
   */
  const findWall = (
    near: THREE.Vector3,
    searchRadius = 20,
  ): { eye: THREE.Vector3; target: THREE.Vector3 } | null => {
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    if (!physics?.ready) return null;
    const eyeHeight = GAMEPLAY.player.height + GAMEPLAY.player.eyeOffset;
    const ground = world?.sampleGround(near.x, near.z);
    if (ground === null || ground === undefined) return null;
    const origin = new THREE.Vector3(near.x, ground + eyeHeight, near.z);
    const dir = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      dir.set(Math.cos(a), 0, Math.sin(a));
      const hit = physics.raycast(origin, dir, { maxDistance: searchRadius });
      // Far enough that the camera is not inside the wall, near enough that the
      // surface fills the frame; and near-vertical, so it is a wall not a floor.
      if (hit && hit.distance > 1.6 && Math.abs(hit.normal.y) < 0.35) {
        const point = hit.point.clone();
        const eye = point.clone().addScaledVector(hit.normal, 1.1);
        eye.y = ground + eyeHeight;
        return { eye, target: point };
      }
    }
    return null;
  };

  /**
   * The compass direction from `eye` with the longest unobstructed sightline.
   *
   * Hardcoded look targets do not survive this level: it is procedurally
   * assembled, so adding content shifts downstream RNG and moves buildings.
   * Two shots ended up aimed into a wall from a metre away that way. Choosing
   * the direction from the geometry that is actually there is stable.
   */
  const clearestDirection = (
    eye: THREE.Vector3,
    opts: { samples?: number; maxDistance?: number; preferYaw?: number } = {},
  ): { direction: THREE.Vector3; distance: number } => {
    const physics = ctx.tryGet<PhysicsSystem>('physics');
    const samples = opts.samples ?? 48;
    const maxDistance = opts.maxDistance ?? 90;
    const best = { direction: new THREE.Vector3(0, 0, -1), distance: 0 };
    if (!physics?.ready) return best;
    const dir = new THREE.Vector3();
    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      dir.set(Math.sin(a), 0, -Math.cos(a));
      const hit = physics.raycast(eye, dir, { maxDistance });
      let reach = hit ? hit.distance : maxDistance;
      // Break ties toward a requested heading so a shot can still be composed.
      if (opts.preferYaw !== undefined) {
        const delta = Math.abs(angleDelta(a, opts.preferYaw));
        reach *= 1 - Math.min(0.45, delta / Math.PI * 0.45);
      }
      if (reach > best.distance) {
        best.distance = reach;
        best.direction.copy(dir);
      }
    }
    return best;
  };

  /** Stand at `eye` and look down the clearest lane, slightly above the horizon. */
  const lookDownLane = (eye: THREE.Vector3, preferYaw?: number): number => {
    const resolved = resolveEye(eye);
    const best = clearestDirection(resolved, preferYaw === undefined ? {} : { preferYaw });
    const target = resolved
      .clone()
      .addScaledVector(best.direction, Math.max(6, best.distance * 0.85));
    target.y = resolved.y + Math.min(2.5, best.distance * 0.04);
    look(resolved, target);
    return best.distance;
  };

  return {
    ctx,
    world,
    findInterior,
    findWall,
    clearestDirection,
    lookDownLane,
    player: ctx.tryGet<PlayerSystem>('player'),
    weapons: ctx.tryGet<WeaponSystem>('weapons'),
    ai: ctx.tryGet<AISystem>('ai'),
    combat: ctx.tryGet<CombatSystem>('combat'),
    fx: ctx.tryGet<FXSystem>('fx'),
    ui: ctx.tryGet<UISystem>('ui'),
    render: ctx.tryGet<RenderSystem>('render'),
    killstreaks: ctx.tryGet<KillstreakSystem>('killstreaks'),
    at,
    look,
    frames,
    freeze: () => {
      ctx.time.timeScale = 0;
    },
    resume: () => {
      ctx.time.timeScale = 1;
    },
    spawnEnemies,
  };
}

/**
 * A vantage point on the main street, chosen because it has depth: near cover,
 * mid-ground buildings and a distant skyline all in one frame, which is what
 * exposes flat lighting and missing aerial perspective.
 */
const STREET_EYE = V(2, 1.64, 34);
const STREET_TARGET = V(2, 3.4, -20);

const UP = /* @__PURE__ */ V(0, 1, 0);

/** Six axes used to decide whether a camera position is inside solid geometry. */
const BURIED_PROBES: readonly THREE.Vector3[] = [
  V(1, 0, 0),
  V(-1, 0, 0),
  V(0, 0, 1),
  V(0, 0, -1),
  V(0, 1, 0),
  V(0, -1, 0),
];

export const SHOTS: readonly ShotDefinition[] = [
  {
    name: '01_spawn_overview',
    description: 'Player spawn looking down the main street',
    setup: (c) => {
      c.weapons?.equip('ar_mk4');
      c.look(STREET_EYE, STREET_TARGET);
    },
  },
  {
    name: '02_weapon_hipfire',
    description: 'Viewmodel at hip on the street',
    setup: (c) => {
      c.weapons?.equip('ar_mk4');
      c.lookDownLane(V(2, 1.64, 22), 0);
    },
  },
  {
    name: '03_weapon_ads',
    description: 'Aiming down sights through the optic',
    settleFrames: 90,
    setup: async (c) => {
      c.weapons?.equip('ar_mk4');
      c.lookDownLane(V(2, 1.64, 26), 0);
      // ADS is an animated transition, so hold the aim input long enough for
      // the pose to arrive rather than photographing it mid-blend.
      holdAim(c, true);
      await c.frames(80);
    },
  },
  {
    name: '04_interior',
    description: 'Interior with light through windows',
    setup: (c) => {
      c.weapons?.equip('smg_mp5');
      const hall = c.at('market_hall', V(2, 0, 15));
      const inside =
        c.findInterior(hall, 16) ?? c.findInterior(c.at('warehouse', V(-19, 0, -12)), 18);
      // Look across the room rather than at whichever wall a fixed offset hit.
      c.lookDownLane(inside ?? V(2, 1.64, 18));
    },
  },
  {
    name: '05_material_closeup',
    description: 'Close-up of wall and prop materials',
    setup: (c) => {
      c.weapons?.equip('pistol_m19');
      // Find a real wall and stand off it, rather than trusting a hardcoded
      // coordinate: the first version of this shot sat 35cm off the ground
      // behind a parapet and never showed a material at all.
      const wall = c.findWall(V(2, 0, 18), 22);
      if (wall) c.look(wall.eye, wall.target);
      else c.look(V(2, 1.5, 20), V(2, 1.4, 14));
    },
  },
  {
    name: '06_skyline',
    description: 'Sky, sun, aerial perspective, distant LODs',
    setup: (c) => {
      const roof = c.at('rooftop_east', V(44, 9.5, -12));
      c.look(V(roof.x, roof.y + 1.64, roof.z), V(roof.x - 40, roof.y + 14, roof.z + 60));
    },
  },
  {
    name: '07_combat',
    description: 'Firefight: muzzle flash, tracers, enemies, impacts',
    settleFrames: 40,
    setup: async (c) => {
      c.weapons?.equip('ar_mk4');
      const eye = V(2, 1.64, 26);
      const lane = c.lookDownLane(eye, 0);
      const dir = c.clearestDirection(eye, { preferYaw: 0 }).direction;
      c.spawnEnemies(eye.clone().addScaledVector(dir, Math.min(22, lane * 0.6)), 5, 6);
      await c.frames(40);
      holdFire(c, true);
      await c.frames(14);
      holdFire(c, false);
      await c.frames(2);
    },
  },
  {
    name: '08_explosion',
    description: 'Detonation with debris and smoke',
    settleFrames: 24,
    setup: async (c) => {
      c.weapons?.equip('ar_mk4');
      const eye = V(2, 1.64, 26);
      const lane = c.lookDownLane(eye, 0);
      const dir = c.clearestDirection(eye, { preferYaw: 0 }).direction;
      const at = eye.clone().addScaledVector(dir, Math.min(20, Math.max(10, lane * 0.5)));
      await c.frames(6);
      const ground = c.world?.sampleGround(at.x, at.z) ?? 0;
      c.combat?.explode({
        position: V(at.x, ground + 0.5, at.z),
        radius: 9,
        damage: 140,
        falloff: 'quadratic',
        source: null,
        kind: 'grenade',
        impulse: 2600,
      });
      // Catch the fireball at its peak, a few frames after ignition.
      await c.frames(6);
    },
  },
  {
    name: '08b_enemies',
    description: 'Enemy character models at readable range',
    settleFrames: 30,
    setup: async (c) => {
      c.weapons?.equip('ar_mk4');
      const eye = V(2, 1.64, 24);
      const lane = c.lookDownLane(eye, 0);
      // Put them on the sightline that actually exists, at a range where the
      // model reads: the camera runs an 80 degree vertical FOV, so a 1.8m
      // soldier is only about 75px tall at 12m in a 900px frame.
      const dir = c.clearestDirection(eye, { preferYaw: 0 }).direction;
      const at = eye.clone().addScaledVector(dir, Math.min(13, Math.max(8, lane * 0.5)));
      c.spawnEnemies(at, 4, 3.5);
      await c.frames(50);
    },
  },
  {
    name: '09_airstrike_paint',
    description: 'Airstrike tablet targeting overlay',
    settleFrames: 30,
    setup: async (c) => {
      // Earn the strike the normal way rather than granting it, so the tablet
      // opens through exactly the path a player takes.
      for (let i = 0; i < 8; i++) c.killstreaks?.addKill();
      c.look(V(2, 1.64, 44), STREET_TARGET);
      await c.frames(6);
      c.killstreaks?.activate('airstrike');
      await c.frames(24);
    },
  },
  {
    name: '10_airstrike_impact',
    description: 'Airstrike detonation chain walking across the map',
    settleFrames: 30,
    setup: async (c) => {
      const target = c.at('market', V(2, 0, 8));
      // Stand well back down the street so the whole walked line fits in frame
      // and the strike lands outside the danger-close radius.
      c.look(V(2, 1.64, 46), V(target.x, target.y + 6, target.z));
      await c.frames(6);
      const strike = c.killstreaks as unknown as StrikeControls | undefined;
      strike?.callAirStrike(target, Math.PI * 0.5, 'carpet');
      // The sequence runs ~6.2s of game time from call to last detonation.
      // Frames, not seconds, because software rendering is ~1fps.
      await c.frames(150);
    },
  },
  {
    name: '11_hud_full',
    description: 'Full HUD with every element populated',
    settleFrames: 20,
    setup: async (c) => {
      c.weapons?.equip('ar_mk4');
      const eye = V(2, 1.64, 26);
      const lane = c.lookDownLane(eye, 0);
      const dir = c.clearestDirection(eye, { preferYaw: 0 }).direction;
      c.spawnEnemies(eye.clone().addScaledVector(dir, Math.min(20, lane * 0.6)), 4, 6);
      c.ui?.pushKillfeed('VIPER', 'HOSTILE 4', 'ar_mk4', true, true);
      c.ui?.pushKillfeed('HOSTILE 2', 'RECON 1', 'smg_mp5', false, false);
      c.ui?.pushKillfeed('VIPER', 'HOSTILE 1', 'sniper_bolt', true, true);
      c.ui?.announce('AIRSTRIKE READY', 'PRESS 4 TO DEPLOY', 4);
      c.ui?.showHitmarker('headshot');
      c.ui?.showDamageDirection(V(-0.7, 0, 0.7));
      c.ui?.setObjectiveMarker('capture:a', V(2, 2, -10), 'OBJECTIVE A');
      for (let i = 0; i < 4; i++) c.killstreaks?.addKill();
      await c.frames(12);
    },
  },
  {
    name: '12_dusk',
    description: 'Low sun for long shadows and warm rim light',
    settleFrames: 40,
    setup: async (c) => {
      const sky = c.render as unknown as SkyControls | undefined;
      sky?.setTimeOfDay?.(0.82);
      c.weapons?.equip('ar_mk4');
      c.lookDownLane(STREET_EYE, 0);
      // The environment re-bakes and auto-exposure has to re-adapt.
      await c.frames(50);
    },
  },
];

/**
 * Drive the aim/fire actions directly. Input is keyboard/mouse driven and there
 * is no synthetic-input API, so the capture harness pushes the action state that
 * `Input.isDown` reads.
 */
interface ForcedInput {
  forceAction?(action: string, down: boolean): void;
}

function holdAim(c: ShotContext, down: boolean): void {
  (c.ctx.input as unknown as ForcedInput).forceAction?.('aim', down);
}

function holdFire(c: ShotContext, down: boolean): void {
  (c.ctx.input as unknown as ForcedInput).forceAction?.('fire', down);
}

export function installCaptureHooks(ctx: EngineContext): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get('capture') !== '1') return;

  const shotCtx = makeContext(ctx);
  const byName = new Map(SHOTS.map((s) => [s.name, s]));

  // Adaptive resolution exists to hold 60fps, and under software rendering it
  // drives straight to its floor — 0.55 of requested, so a 1600px capture was
  // being rendered at 880 and upscaled. Every frame in an entire review pass was
  // judged for softness that was this line's fault. A capture wants the
  // resolution it asked for, however slowly that arrives.
  ctx.engine.setAdaptiveResolution(false);

  // The combat shots stage a real firefight and the AI is lethal, so the player
  // was being killed during the settle and the frame came back as a death
  // screen. Topping health back up cannot fix that — once the entity is dead it
  // stays dead — so damage has to be refused rather than healed.
  const entity = shotCtx.player?.entity as { applyDamage: (info: DamageInfo) => void } | undefined;
  if (entity) entity.applyDamage = () => {};

  const run = async (name: string): Promise<string> => {
    const shot = byName.get(name);
    if (!shot) throw new Error(`unknown shot "${name}" (have: ${[...byName.keys()].join(', ')})`);

    // Clear transient state so shots do not contaminate each other. The tablet
    // is the important one: left open it composites over everything and the next
    // three shots all come back as pictures of a map.
    shotCtx.resume();
    holdFire(shotCtx, false);
    holdAim(shotCtx, false);
    shotCtx.killstreaks?.cancelTargeting();
    shotCtx.ui?.setKillstreakSelectionOpen(false);
    shotCtx.ui?.setObjectiveMarker('capture:a', null);
    shotCtx.weapons?.setInputEnabled(true);
    await shotCtx.frames(2);

    await shot.setup(shotCtx);
    // TAA needs a run of frames on a static pose to resolve, and auto-exposure
    // needs longer than that, so every shot pays a convergence tail.
    await shotCtx.frames(shot.settleFrames ?? 26);
    // Hold the frame still so the screenshot cannot land mid-animation.
    shotCtx.freeze();
    await shotCtx.frames(2);
    return shot.description;
  };

  const target = window as unknown as {
    __SHOT__: (name: string) => Promise<string>;
    __SHOT_LIST__: () => Array<{ name: string; description: string }>;
    __GRAB__: () => string;
  };
  target.__SHOT__ = run;
  target.__SHOT_LIST__ = () => SHOTS.map((s) => ({ name: s.name, description: s.description }));
  /**
   * Read the framebuffer back directly. Playwright's own screenshot waits for
   * the page to look visually stable, which never happens under software
   * rendering at roughly one frame per second. Drawing and encoding inside one
   * task sidesteps that entirely, and is the only point at which the buffer is
   * guaranteed intact given `preserveDrawingBuffer: false`.
   */
  target.__GRAB__ = () => {
    ctx.engine.renderOnce();
    return ctx.renderer.domElement.toDataURL('image/png');
  };
  console.info(`[capture] __SHOT__ installed with ${SHOTS.length} states`);
}
