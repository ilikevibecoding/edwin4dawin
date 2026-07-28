import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import { Groups } from '../core/GameContext';
import type { CoverPoint, IPhysics, IPlayer, ISky, IWorld } from '../core/Interfaces';
import { angleDelta } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import type AISystem from './AISystem';
import type { Agent } from './Agent';
import { NavPath } from './NavGrid';
import { PARTICLES, P_PELVIS, type RagdollBody } from './Ragdoll';
import { STANCE_CROUCH, STANCE_PRONE, STANCE_STAND } from './SoldierRig';
import { B } from './SoldierSkeleton';
import { ROLE_NAMES } from './Squad';
import { AI } from './Tuning';

/**
 * The AI test range, active on `?showcase=ai`.
 *
 * Everything the AI does is a function of a player it can see and a world it
 * can walk on, neither of which a screenshot harness has. So this substitutes
 * both: a scripted target the agents perceive exactly as they would a real
 * player, and a fast-forward that steps physics and AI together so a ragdoll
 * can be photographed after it has settled rather than while it is still
 * falling. Each vantage rebuilds its scene from scratch, so the five shots are
 * five independent, repeatable experiments rather than five moments in one
 * drifting simulation.
 *
 * `window.__AI__` exposes the same controls to `tools/ai-test.mjs`, which is
 * where the numbers that cannot be judged by eye — path validity, frame cost
 * with sixteen agents, cover exclusivity, headshot multipliers — are asserted.
 */

interface StepPhysics extends IPhysics {
  stepBodies?(dt: number): void;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
/** Private to the open-ground sweep, whose result is returned through `_v2`. */
const _probe = new THREE.Vector3();
/** Private to the sky-openness test, which runs inside the anchor search. */
const _sky = new THREE.Vector3();
const _skyFrom = new THREE.Vector3();
/** Private to the camera-placement sweep, whose result is the caller's `out`. */
const _look = new THREE.Vector3();
const _view = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _lit = new THREE.Vector3();
const _seed = new THREE.Vector3();
/** Private to the in-frame test: a camera basis and a subject in it. */
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();
const _rel = new THREE.Vector3();
/** Private to the visibility test, which runs inside the camera sweep. */
const _sight = new THREE.Vector3();
/** Private to the lane search, measuring how much room a lane has beside it. */
const _lane = new THREE.Vector3();
const _laneOut = new THREE.Vector3();

/**
 * Bearings the camera will accept, nearest the one asked for first, and the
 * fractions of the nominal range it will try. Both are swept in full and
 * scored; neither is a bail-out order.
 */
const SWINGS = [0, 0.26, -0.26, 0.52, -0.52, 0.78, -0.78, 1.05, -1.05, 1.4, -1.4, 1.9, -1.9];
const PULLS = [1, 0.82, 0.66, 0.52, 1.25, 1.55];

/** What a shot asks of `viewpoint`. Built once per vantage, never per frame. */
interface Vantage {
  /** Bearing from the subject the camera would like to stand on. */
  prefer: number;
  dist: number;
  height: number;
  /** Height above a subject's feet that his own body does not block. */
  lift?: number;
  /** Height above the subject the camera aims at. */
  focusLift?: number;
  /** Metres of range per metre of group spread, so a crowd fits. */
  fit?: number;
  /** Never back off past this, whatever the spread says. */
  cap?: number;
  /** The lens this shot is taken with, so the sweep knows what fits. */
  fov: number;
  /** Photograph only the men within this radius of the thickest of them. */
  cluster?: number;
  /**
   * How many men make the picture, past which another one is worth very little.
   *
   * Without a ceiling the sweep will trade any amount of distance for one more
   * body in the frame, because a man is worth a hundred points and a metre of
   * closeness three. That is how a firefight ends up photographed from
   * thirty-five metres with eight soldiers in it, each of them thirty pixels
   * tall. Three men reads as a squad; the fourth is a bonus, and not worth
   * standing another six metres back for.
   */
  enough?: number;
  /** How tall a subject is, so the frame can be asked to hold all of him. */
  tall?: number;
  /**
   * How far off `prefer` the sweep may wander, in radians.
   *
   * A group shot only needs to find somewhere with a view and will take any
   * bearing that has one. A portrait will not: the bearing *is* the shot, and
   * a sweep free to travel two radians photographs the back of a man who was
   * carefully stood three-quarters on to the lens.
   */
  swing?: number;
  /** Photograph this instead of the live agents. */
  only?: THREE.Vector3 | null;
}

const SKY_MASK = Groups.WORLD | Groups.PROP;
const UP = new THREE.Vector3(0, 1, 0);
/**
 * Where the visibility probe aims, relative to a subject's feet: half a metre
 * off his body axis to clear his own shoulders, at knee and chest height so
 * that low cover between him and the lens is caught as well as a wall.
 */
const SHOULDERS = [0.5, -0.5];
const SIGHT_HEIGHTS = [0.5, 1.25];
/** What the capture harness renders at, and so what "in frame" means here. */
const ASPECT = 16 / 9;

/**
 * Mid-morning, thin cloud, little dust.
 *
 * The level's default is a low evening sun, which is atmospheric and useless
 * here: every one of these shots exists to be inspected, and half the street is
 * in shadow deep enough to hide the kit, the gait and the ragdoll alike. A high
 * sun is the studio light for judging a character.
 */
const SHOWCASE_HOUR = 9.6;

export class AIShowcase {
  private ctx: GameContext;
  private ai: AISystem;
  private target: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    eye: THREE.Vector3;
    alive: boolean;
    crouched: boolean;
    radius: number;
    height: number;
    scripted: boolean;
    scriptedDamage: number;
    scriptedHits: number;
  };
  private world: IWorld | null;
  private physics: StepPhysics | null;

  /** Centre of the demonstration area, chosen from the level's own spawns. */
  private readonly anchor = new THREE.Vector3();
  /** Where the portrait's single soldier stands: the anchor, moved into the sun. */
  private readonly portrait = new THREE.Vector3();
  /** For the shadow queries physics cannot answer. Setup only; never per frame. */
  private readonly caster = new THREE.Raycaster();
  /** Bearing the cover shot watches from, decided by the cover it found. */
  private coverView = 0;
  /** Bearing the firefight watches from, decided by the lane it was fought in. */
  private fightView = 0;
  /** Bearing the squad shot watches from: broadside to the line of march. */
  private squadView = 0;
  /** True once the anchor has been re-picked against a known sun position. */
  private anchorLit = false;
  private readonly probe = new NavPath();
  private returnFire = 0;
  private returnFireOn = false;

  constructor(ctx: GameContext, ai: AISystem, target: AIShowcase['target']) {
    this.ctx = ctx;
    this.ai = ai;
    this.target = target;
    this.world = ctx.tryGet<IWorld>('world') ?? null;
    this.physics = (ctx.tryGet<IPhysics>('physics') as StepPhysics) ?? null;

    this.lightScene();
    // The director holds the AI down until a match starts, and on this range no
    // match ever does.
    ai.setEnabled(true);
    this.pickAnchor();
    this.target.scripted = true;
    this.target.alive = true;
    this.target.position.copy(this.anchor);
    this.target.eye.copy(this.anchor).setY(this.anchor.y + 1.6);

    // The player controller would otherwise fight the camera and shoot at the
    // demonstration; the harness poses the camera itself.
    const player = ctx.tryGet<IPlayer>('player');
    if (player) {
      player.enabled = false;
      player.setFrozen?.(true);
    }

    this.install();
    this.registerShots();
    console.log('[ai] showcase ready — window.__AI__');
  }

  /** Raises the sun so the subject of every shot is actually visible. */
  private lightScene(): void {
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!sky) return;
    // Time of day only. Presets and cloud cover both force the volumetric
    // cloud pass and the environment probe to rebake, which under software
    // rasterisation costs half a minute of boot and is not worth it for
    // weather that appears in none of these frames.
    sky.setTimeOfDay(SHOWCASE_HOUR);
    // Airborne dust is the level's signature and it reads beautifully in a
    // landscape shot, but eight men firing inside it photograph as one orange
    // smear.
    sky.setWeather({ dust: 0.12, haze: 0.34 });
  }

  /** Horizontal bearing toward the sun, which is the side worth shooting from. */
  private sunBearing(): number {
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!sky) return 0;
    const d = sky.sunDirection;
    return Math.hypot(d.x, d.z) < 1e-4 ? 0 : Math.atan2(d.x, d.z);
  }

  /**
   * Whether a man standing here would be in sunlight, 0..1 over his height.
   *
   * This has to be asked along the sun's own bearing and no other. A first
   * attempt scored how much *sky* a point could see, sampling a cone steeper
   * than the sun actually sits at, and duly picked a wide street with a
   * three-storey block on its sunward side: open to the sky, in shadow all
   * morning, and every soldier photographed there a black cut-out.
   */
  private sunExposure(at: THREE.Vector3): number {
    const physics = this.physics;
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!physics || !sky || sky.sunDirection.y <= 0.05) return 1;
    _sky.copy(sky.sunDirection);
    let lit = 0;
    for (let i = 0; i < 3; i++) {
      _skyFrom.set(at.x, at.y + 0.4 + i * 0.7, at.z);
      if (!physics.raycast(_skyFrom, _sky, 70, SKY_MASK)) lit++;
    }
    return lit / 3;
  }

  /**
   * Finds an open stretch of the level with cover nearby: the demonstration
   * needs somewhere a squad can advance across and something to hide behind,
   * and the world is procedural so neither can be hard-coded.
   */
  private pickAnchor(): void {
    const world = this.world;
    if (!world) {
      this.anchor.set(0, 0, 0);
      return;
    }
    let best = -Infinity;
    for (const spawn of world.spawnPoints) {
      let nearby = 0;
      for (const cover of world.coverPoints) {
        if (cover.position.distanceToSquared(spawn.position) < 14 * 14) nearby++;
      }
      // Somewhere with cover but not inside a building: openness is measured by
      // how much walkable ground surrounds the point.
      let open = 0;
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2;
        if (world.isWalkable(spawn.position.x + Math.cos(angle) * 6, spawn.position.z + Math.sin(angle) * 6)) {
          open++;
        }
      }
      const score = nearby * 1.5 + open * 6 + this.sunExposure(spawn.position) * 70;
      if (score > best) {
        best = score;
        this.anchor.copy(spawn.position);
      }
    }
  }

  /**
   * Re-picks the anchor once the sky has actually moved the sun.
   *
   * `setTimeOfDay` only records the hour; `sunDirection` is recomputed on the
   * sky's next frame, which has not happened by the time this class is
   * constructed. So the constructor gets a geometric anchor and the first shot
   * gets the one that is in the light.
   */
  private ensureSunlitAnchor(): void {
    if (this.anchorLit) return;
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!sky || sky.sunDirection.y <= 0.05) return;
    this.anchorLit = true;
    this.pickAnchor();
    this.target.position.copy(this.anchor);
    this.target.eye.copy(this.anchor).setY(this.anchor.y + 1.6);
  }

  /* ------------------------------ scenarios -------------------------------- */

  /** Clears the board. Every scenario starts from nothing. */
  private clear(): void {
    this.ensureSunlitAnchor();
    this.ai.killAll();
    this.returnFireOn = false;
    this.target.alive = true;
    this.target.crouched = false;
    this.target.velocity.set(0, 0, 0);
  }

  /** Steps physics and AI together, for scenarios that need to have happened. */
  advance(seconds: number, dt = 1 / 60): void {
    // The match director holds the AI down while the game sits on its menu, and
    // on this showcase the game always does: nothing ever presses Deploy. So
    // the range takes the AI back before every step. Without it `advance` turns
    // the world for the requested number of seconds and every soldier in it
    // stands exactly where he was put, which reads in the harness as a
    // navigation failure rather than as an AI that was switched off.
    if (!this.aiHeld && !this.ai.isEnabled) this.ai.setEnabled(true);
    const steps = Math.min(1200, Math.max(1, Math.round(seconds / dt)));
    for (let i = 0; i < steps; i++) {
      this.physics?.stepBodies?.(dt);
      this.ai.update(dt, this.ctx);
    }
  }

  /** Set when the harness itself asked for the AI to stop, via `__AI__.enabled`. */
  private aiHeld = false;

  /** The harness turning the AI off on purpose, which `advance` must respect. */
  holdAI(held: boolean): void {
    this.aiHeld = held;
    this.ai.setEnabled(!held);
  }

  /** Puts the scripted target somewhere and tells the world it moved. */
  setTarget(x: number, y: number, z: number): void {
    this.target.position.set(x, y, z);
    this.target.eye.set(x, y + 1.6, z);
    this.target.alive = true;
  }

  /**
   * Bearing the camera shoots from, and therefore the bearing everything else
   * is arranged around: standing between the sun and the subject is the only
   * way to photograph a dark green man in a dark brown street.
   */
  private front(): number {
    return this.sunBearing();
  }

  /** A point `dist` metres from `at` on the given compass bearing. */
  private orbit(out: THREE.Vector3, at: THREE.Vector3, bearing: number, dist: number, height: number): THREE.Vector3 {
    return out.set(at.x + Math.sin(bearing) * dist, at.y + height, at.z + Math.cos(bearing) * dist);
  }

  /**
   * Raises a camera to eye height over whatever it is standing on, and reports
   * how far that floor is above the subjects'.
   *
   * `orbit` measures height from the subjects' feet, which is right when
   * camera and subject share a floor and wrong the moment they do not. This
   * town is built in terraces, and the squad shot found a loading dock a metre
   * and three quarters above the street the squad was marching down: two point
   * one metres over the soldiers' boots put the lens forty centimetres above
   * the dock's deck, and half the photograph was concrete. Every sight-line
   * was genuinely clear — the men were visible over the edge, from the shins
   * up, in the top half of the frame.
   *
   * `height` above the higher of the two floors, so the lens never sinks into
   * the one it is standing on and never drops below the subject-relative
   * framing the vantage asked for.
   */
  private standOn(view: THREE.Vector3, feet: number, height: number): number {
    const floor = this.physics?.groundHeight(view.x, view.z, feet + height + 4);
    if (floor === null || floor === undefined) return 0;
    view.y = Math.max(floor, feet) + height;
    return floor - feet;
  }

  /**
   * A patch of walkable ground near `near` that the sun actually reaches.
   *
   * The camera sweep can choose where to stand and cannot choose where the sun
   * is: put a soldier in the shade of a three-storey block and every bearing
   * photographs a grey cut-out against a lit wall, which is what the portrait
   * kept coming back as. Moving the subject a few metres into the light is the
   * only lever that works. Widening rings, so the nearest lit spot wins and the
   * shot stays near the anchor it is supposed to be showing.
   *
   * Candidates are snapped to the navigation graph and kept only if the snap
   * lands near where it was asked for. Filtering on `world.isWalkable` instead
   * rejects every one of them here: the anchor is a stone plinth against a
   * wall, the ground around it is dock and rubble, and the sweep came back with
   * the shaded spot it started from.
   */
  private sunnySpot(near: THREE.Vector3, radius: number, out: THREE.Vector3): boolean {
    out.copy(near);
    let best = this.sunlitWithRoom(near);
    for (let r = 2.5; r <= radius; r += 2.5) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        _probe.set(near.x + Math.cos(angle) * r, near.y, near.z + Math.sin(angle) * r);
        this.world?.nearestNavPoint(_probe, _probe);
        if (Math.hypot(_probe.x - near.x, _probe.z - near.z) > r + 1.5) continue;
        // Mild distance penalty: the shot is meant to be of this place, and a
        // brilliantly lit spot twelve metres away is a different photograph.
        const score = this.sunlitWithRoom(_probe) - r * 0.02;
        if (score <= best) continue;
        best = score;
        out.copy(_probe);
      }
    }
    // Three of the four marks available, which is open sky at every height up
    // the body with no frond over it. Anything less and the caller is better
    // off leaving the subject where the scene put him.
    return best > 3;
  }

  /**
   * Sun on a point, plus half marks for the sun a metre either side of it along
   * the sun's own bearing.
   *
   * Straight exposure is a knife edge and the anchor sits on one: the anchor
   * itself measured fully lit while the ground a metre and a half away, where
   * the soldier actually ended up after the tree had run him into contact, had
   * only his helmet in the sun. Asking for light with room around it picks the
   * middle of a lit patch rather than its edge.
   */
  private sunlitWithRoom(at: THREE.Vector3): number {
    const bearing = this.sunBearing();
    const sx = Math.sin(bearing);
    const sz = Math.cos(bearing);
    let score = this.sunExposure(at) * 2;
    for (let s = -1; s <= 1; s += 2) {
      _rel.set(at.x + sx * s, at.y, at.z + sz * s);
      score += this.sunExposure(_rel);
    }
    // One scene ray, at the chest, for the shadows physics cannot see. Worth
    // more than everything above it: a frond's shade is as dark as a wall's and
    // the physics probes are blind to it, so a point they score a perfect four
    // can still be the worst place in the street to stand.
    _rel.set(at.x, at.y + 1.15, at.z);
    if (this.shaded(_rel)) score -= 3;
    return score;
  }

  /**
   * Whether anything in the level's own geometry stands between a point and the
   * sun, foliage included.
   *
   * Physics cannot answer this. The palm crowns are defined `castShadow: true,
   * collide: false` — correct, since nobody should bump into a frond eight
   * metres up — so every sun ray fired at the collision world passes straight
   * through them and reports open sky. Both the portrait and the corpse were
   * placed in what the probes swore was full sun and photographed under the
   * dappled shade of a palm, which is the one thing that renders and the one
   * thing that could not be measured.
   *
   * A scene raycast is the only query that sees what the shadow map sees, and
   * at nine milliseconds against four hundred thousand triangles it is far too
   * slow for the camera sweep. It is affordable exactly where it is needed:
   * choosing the handful of places a subject might stand.
   */
  private shaded(at: THREE.Vector3): boolean {
    const world = this.world;
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!world || !sky || sky.sunDirection.y <= 0.05) return false;
    this.caster.set(at, sky.sunDirection);
    this.caster.far = 70;
    return this.caster.intersectObject(world.root, true).length > 0;
  }

  /** Whether the sun reaches a single point. Cheaper than `sunExposure`. */
  private litAt(p: THREE.Vector3): boolean {
    const physics = this.physics;
    const sky = this.ctx.tryGet<ISky>('sky');
    if (!physics || !sky || sky.sunDirection.y <= 0.05) return true;
    return !physics.raycast(p, sky.sunDirection, 70, SKY_MASK);
  }

  /**
   * Whether a camera here would be standing out of doors.
   *
   * Asking only whether the sun reaches the lens is not the same question and
   * gets this wrong in the one place it matters. Under the lip of a market
   * canopy a mid-morning sun still slips past the edge and strikes the camera,
   * so the point reads as lit while every square metre of floor in front of it
   * is in the canopy's shadow — which is how the firefight came back with its
   * bottom half black. A slab overhead is the thing to test for.
   */
  private openSky(p: THREE.Vector3): boolean {
    const physics = this.physics;
    if (!physics) return true;
    return !physics.raycast(p, UP, 14, SKY_MASK) && this.litAt(p);
  }

  /**
   * How much of the ground between the camera and its subject is in sunlight,
   * 0..1. A frame is mostly the floor in front of the lens, and this level's
   * shade is deep enough to read as black, so a viewpoint that can see every
   * man across thirty square metres of shadow is still a bad photograph.
   */
  private litPath(from: THREE.Vector3, to: THREE.Vector3): number {
    let lit = 0;
    for (let i = 1; i <= 4; i++) {
      _lit.lerpVectors(from, to, i / 5);
      _lit.y = to.y + 0.5;
      if (this.litAt(_lit)) lit++;
    }
    return lit / 4;
  }

  /** Feet of every live agent, refilled per shot. Pooled; never reallocated. */
  private readonly subject: THREE.Vector3[] = [];
  /** Whether each subject is standing out of doors. Parallel to `subject`. */
  private readonly subjectOpen: boolean[] = [];
  private subjectCount = 0;

  private collectSubjects(only: THREE.Vector3 | null): number {
    this.subjectCount = 0;
    const take = (p: THREE.Vector3): void => {
      (this.subject[this.subjectCount] ??= new THREE.Vector3()).copy(p);
      this.subjectCount++;
    };
    if (only) take(only);
    else for (const a of this.ai.agentList) if (a.active) take(a.position);
    return this.subjectCount;
  }

  /**
   * Whether a point `up` metres above `foot` falls inside the frame described
   * by the current `_view`/`_fwd`/`_right`/`_upv` basis. Called only from the
   * camera sweep, which owns those.
   */
  private framed(foot: THREE.Vector3, up: number, tanH: number, tanV: number): boolean {
    _rel.set(foot.x, foot.y + up, foot.z).sub(_view);
    const z = _rel.dot(_fwd);
    if (z < 1.2) return false;
    return Math.abs(_rel.dot(_right)) <= tanH * z && Math.abs(_rel.dot(_upv)) <= tanV * z;
  }

  /**
   * Whether the camera at `_view` can actually see the man standing on `foot`.
   *
   * The obvious test — cast at his chest — cannot be used, because he is a
   * collider himself and stops the ray every time. The first version dodged
   * that by aiming well over his helmet, on the reasoning that whatever hides
   * a man is taller than he is. Chest-high concrete is not, and the squad shot
   * came back as a photograph of a barrier: the probe passed cleanly two and a
   * half metres up while every soldier behind it was hidden to the shoulders.
   *
   * So the sight-lines go past him rather than over him — half a metre to
   * either side of his body axis, which clears his own shoulders and is still
   * inside the metre or so of frame he occupies. Knee height and chest height,
   * because a waist-high wall blocks one and not the other. Either shoulder
   * will do: a man half-behind a corner is a man you can see.
   *
   * Kept along with the overhead probe rather than replacing it, since an
   * awning that cuts the frame off above the subjects is worth avoiding too.
   *
   * `boots` asks for the knee line as well as the chest line, and is given up
   * along with the rest of the whole-man requirements after the first pass.
   * Demanding it everywhere is nearly as bad as demanding nothing: this town
   * kerbs and plinths every street, and a shot of four men from the knees up
   * with a kerb across the bottom of the frame is a photograph, where the
   * alternative the sweep reached for was the same four men from behind.
   */
  private visible(foot: THREE.Vector3, overhead: number, boots: boolean): boolean {
    const physics = this.physics;
    if (!physics) return true;
    _sight.set(foot.x, foot.y + overhead, foot.z);
    if (!physics.lineOfSight(_view, _sight)) return false;
    // Across the line of sight, so the offset is a step sideways from the
    // camera's point of view rather than in some fixed world direction that
    // might put it straight behind him.
    _rel.set(foot.x - _view.x, 0, foot.z - _view.z);
    if (_rel.lengthSq() < 1e-6) return false;
    _rel.normalize();
    for (const side of SHOULDERS) {
      let clear = true;
      for (let h = boots ? 0 : 1; h < SIGHT_HEIGHTS.length; h++) {
        _sight.set(foot.x - _rel.z * side, foot.y + SIGHT_HEIGHTS[h], foot.z + _rel.x * side);
        if (!physics.lineOfSight(_view, _sight)) {
          clear = false;
          break;
        }
      }
      if (clear) return true;
    }
    return false;
  }

  /**
   * Drops every subject that is not within `radius` of the thickest knot of
   * them, and returns how many are left.
   *
   * Eight men in contact do not stay in one frame. Within a few seconds two
   * are behind a wall forty metres up the street, one is flanking through a
   * side alley, and the rest are strung out between. Framing all of them puts
   * the lens thirty-five metres back, where a soldier is thirty pixels tall
   * and the photograph is of an empty street with some dust in it — which is
   * exactly what the firefight vantage kept returning. Four men at ten metres
   * is a firefight; eight men at thirty-five is weather.
   *
   * Which knot wins is decided by daylight as much as by headcount. The
   * densest three here were fighting inside a covered market, and there is no
   * bearing on the compass that photographs that: the camera goes in under the
   * roof with them and the frame comes back as a ceiling above a black floor.
   * Two men in the street outside are the better picture, and score as it.
   */
  private tighten(radius: number): number {
    const n = this.subjectCount;
    if (n <= 2) return n;
    const r2 = radius * radius;
    for (let i = 0; i < n; i++) {
      _lit.set(this.subject[i].x, this.subject[i].y + 1.2, this.subject[i].z);
      this.subjectOpen[i] = this.openSky(_lit);
    }
    let seed = 0;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      let count = 0;
      let open = 0;
      for (let j = 0; j < n; j++) {
        if (this.subject[i].distanceToSquared(this.subject[j]) > r2) continue;
        count++;
        if (this.subjectOpen[j]) open++;
      }
      const score = count + open * 0.8;
      if (score <= bestScore) continue;
      bestScore = score;
      seed = i;
    }
    // Held aside because the compaction below overwrites earlier slots, and
    // the seed is frequently one of them.
    _seed.copy(this.subject[seed]);
    let kept = 0;
    for (let i = 0; i < n; i++) {
      if (_seed.distanceToSquared(this.subject[i]) > r2) continue;
      if (kept !== i) this.subject[kept].copy(this.subject[i]);
      kept++;
    }
    this.subjectCount = kept;
    return kept;
  }

  /**
   * Where to stand to photograph these men, and what to point at once there.
   *
   * The sun decides where the light is and the town decides where you can
   * stand. An earlier version reconciled the two by probing a single point —
   * the centroid of the subjects — and taking the first bearing that reached
   * it. But a squad strung along a street has its centroid in the middle of
   * the road, frequently on the far side of a wall from any of them, so both
   * group shots came back as photographs of masonry with four soldiers
   * somewhere behind it. Every man is probed now, and a bearing that shows six
   * of eight beats one that shows the tarmac between them.
   *
   * `lift` must be a height above a subject's feet that his own body does not
   * occupy: the probe cannot see through him, and aiming into his chest fails
   * from every sane bearing and succeeds only from the one odd angle that
   * happens to miss him.
   *
   * A man only counts if he is inside the frame as well as in front of it.
   * Scoring on line of sight alone rewards standing in the middle of the
   * squad, where everybody is unobstructed and four of them are behind the
   * lens: the firefight duly picked a spot with a soldier three metres off the
   * left of frame, which is a clear view of him by any measure except the
   * photograph.
   *
   * Returns the bearing finally used, which is not always the one asked for.
   */
  private viewpoint(out: THREE.Vector3, focus: THREE.Vector3, opts: Vantage): number {
    const { prefer, dist, height } = opts;
    const lift = opts.lift ?? 2.35;
    const focusLift = opts.focusLift ?? 1;
    const fit = opts.fit ?? 1.8;
    const cap = opts.cap ?? Infinity;
    const tall = opts.tall ?? 1.85;
    this.collectSubjects(opts.only ?? null);
    const n = opts.cluster ? this.tighten(opts.cluster) : this.subjectCount;
    _centre.set(0, 0, 0);
    for (let i = 0; i < n; i++) _centre.add(this.subject[i]);
    if (n > 0) _centre.multiplyScalar(1 / n);
    else _centre.copy(this.anchor);

    // Back off far enough that the whole group fits. A lone subject has no
    // spread, so the close shots keep the distance they asked for.
    let spread = 0;
    for (let i = 0; i < n; i++) {
      spread = Math.max(spread, Math.hypot(this.subject[i].x - _centre.x, this.subject[i].z - _centre.z));
    }
    // Standing clear of the middle of the group, but only just.
    //
    // This was the whole spread plus two and a half metres, on the reasoning
    // that the lens belongs outside the knot rather than in it. That is a
    // photographer's instinct and it is wrong here: four men strung out over
    // twelve metres of street then force the camera fifteen metres back, and
    // what comes back is a picture of a street with some soldiers in it. The
    // frustum test below already discards any viewpoint that loses men off the
    // edges or behind the lens, and the proximity test discards the one that
    // stands inside somebody, so the sweep can be trusted to come as close as
    // the frame allows.
    const clear = Math.min(spread, 3.5) + 2.5;
    const range = Math.min(cap, Math.max(dist, spread * fit, clear));

    this.orbit(out, _centre, prefer, range, height);
    this.standOn(out, _centre.y, height);
    focus.set(_centre.x, _centre.y + focusLift, _centre.z);
    const physics = this.physics;
    if (!physics || n === 0) return prefer;

    // Kept a little inside the true frame edge, so a man who counts is a man
    // standing in the picture rather than half of one clipped by its border.
    const tanV = Math.tan((opts.fov * Math.PI) / 360) * 0.82;
    const tanH = tanV * ASPECT;

    let bestBearing = prefer;
    let best = -Infinity;
    const swing = opts.swing ?? 1.9;
    const enough = opts.enough ?? 3;
    this.sweep.pass = -1;
    this.sweep.seen = 0;
    this.sweep.of = n;
    this.sweep.offset = 0;
    this.sweep.storey = 0;
    this.sweep.range = range;

    /*
     * Three passes, each giving something up, and the first that finds a
     * viewpoint at all wins.
     *
     * Every requirement below is worth having and none of them is worth an
     * empty frame. A bearing held near broadside, a whole man inside the
     * borders, a hand's width of ground under his boots: ask for all of it in
     * a town of narrow streets and there are corners where nothing qualifies.
     * What came back then was the fallback placement — the preferred bearing at
     * the nominal range, aimed wherever that happened to point — which on one
     * run was eight metres of blank wall with the squad behind the camera.
     * Relaxing beats guessing.
     */
    for (let pass = 0; pass < 3 && best === -Infinity; pass++) {
      // Pass 0 wants the whole man. Pass 1 settles for him from the shins up,
      // which is what a foreground figure in a tight frame actually is.
      //
      // The ground under the boots is only asked for when there is more than
      // one subject, because only then can one of them be much nearer the lens
      // than the rest and get his feet cut off by the bottom edge. Demanding it
      // of a portrait costs three metres of standoff — the whole difference
      // between a study of a soldier and a soldier standing in a street.
      const low = pass === 0 ? (n > 1 ? -0.12 : 0.02) : 0.35;
      const high = pass === 0 ? tall : Math.min(tall, 1.35);
      // The bearing is the last thing to go: it is the difference between the
      // shot that was asked for and a shot of something.
      const arc = pass < 2 ? swing : 1.9;
      for (let p = 0; p < PULLS.length; p++) {
        for (let i = 0; i < SWINGS.length; i++) {
          if (Math.abs(SWINGS[i]) > arc) continue;
          const bearing = prefer + SWINGS[i];
          const away = Math.max(clear, Math.min(cap, range * PULLS[p]));
          this.orbit(_view, _centre, bearing, away, height);
          const storey = this.standOn(_view, _centre.y, height);
          // On the subject's own floor, until the last pass. A lens up on a
          // terrace or down in a stairwell can have a clean view of every man
          // and still be the wrong photograph: the squad's first fixed version
          // found a loading dock a metre and three quarters up and shot four
          // men from above, at the tops of their helmets, over a parapet that
          // took the bottom third of the frame. Scoring it down was not enough
          // — a man is worth eighty points and a storey cost ten — so it is a
          // requirement while there is any hope of meeting it.
          if (pass < 2 && Math.abs(storey) > 0.8) continue;
          // The frame this viewpoint would produce, aimed at the group centre.
          // Where the aim ends up is the centroid of whoever it can see, which
          // is inside this cone by construction and so does not move it far.
          _fwd.set(_centre.x, _centre.y + focusLift, _centre.z).sub(_view);
          if (_fwd.lengthSq() < 1e-6) continue;
          _fwd.normalize();
          _right.crossVectors(_fwd, UP);
          if (_right.lengthSq() < 1e-6) continue;
          _right.normalize();
          _upv.crossVectors(_right, _fwd);

          // Nobody standing on the lens. The frustum test would drop him, but
          // a man half a metre off the glass is a wall of shoulder across the
          // corner of the frame whether or not he is counted.
          let crowded = false;
          for (let s = 0; s < n; s++) {
            if (_view.distanceToSquared(this.subject[s]) < 1.7 * 1.7) crowded = true;
          }
          if (crowded) continue;

          _acc.set(0, 0, 0);
          let seen = 0;
          let near = 0;
          for (let s = 0; s < n; s++) {
            // Boots and helmet both, not the chest between them. A chest test
            // passes a man standing three metres off the lens whose head is a
            // long way above the top of the picture, and the firefight came
            // back with exactly that: a soldier cropped at the eyebrows in one
            // corner.
            //
            // A hand's width of ground below the soles rather than the soles
            // themselves, because a man who only just fits is a man standing on
            // the bottom edge of the picture with his boots cut off by it.
            if (!this.framed(this.subject[s], low, tanH, tanV)) continue;
            if (!this.framed(this.subject[s], high, tanH, tanV)) continue;
            if (!this.visible(this.subject[s], lift, pass === 0)) continue;
            _acc.add(this.subject[s]);
            near += _view.distanceTo(this.subject[s]);
            seen++;
          }
          if (seen === 0) continue;
          // Light multiplies the men rather than being added to them, so the
          // sweep will trade two of five for a frame that is not half black but
          // will never trade the last one. A flat bonus did not do it, and nor
          // did a gentle multiplier: the viewpoint under the market awning saw
          // one more man than any other and won on that, and what came back was
          // a ceiling across the top of the frame and pitch across the bottom.
          const lit = (this.openSky(_view) ? 0.55 : 0) + this.litPath(_view, _centre) * 0.45;
          // Enough men, and then as close to them as the frame allows.
          // Everything above is satisfied by a picture in which the soldiers
          // are forty pixels tall, and that picture is a photograph of a street.
          const score =
            Math.min(seen, enough) * (26 + lit * 84) +
            Math.max(0, seen - enough) * 7 -
            (near / seen) * 7 -
            Math.abs(SWINGS[i]) * 9 -
            Math.abs(1 - PULLS[p]) * 10 -
            // Standing on the same floor as the subject, given the choice. A
            // lens up on a terrace shoots over a parapet and down at the tops
            // of helmets; one down in a stairwell shoots up their noses.
            Math.abs(storey) * 6;
          if (score <= best) continue;
          best = score;
          bestBearing = bearing;
          this.sweep.pass = pass;
          this.sweep.seen = seen;
          this.sweep.offset = SWINGS[i];
          this.sweep.storey = storey;
          this.sweep.range = away;
          out.copy(_view);
          focus.copy(_acc).multiplyScalar(1 / seen);
          focus.y += focusLift;
        }
      }
    }
    return bestBearing;
  }

  /**
   * What the last camera sweep settled for, so a harness can ask why a frame
   * came back the way it did.
   *
   * Composition failures all look the same from outside — a wall, a back, an
   * empty street — and are all different inside: no subject framed, no
   * sight-line, a bearing given up in the last pass, a lens on the wrong
   * floor. Guessing between those from a PNG costs a capture a time; this
   * costs nothing and answers it.
   */
  private readonly sweep = {
    pass: -1,
    seen: 0,
    of: 0,
    offset: 0,
    storey: 0,
    range: 0,
  };

  /** Length of the last lane `openLane` found, in metres. */
  private laneRange = 0;
  /** Which flank of that lane has the room: +1 for its right, -1 for its left. */
  private laneSide = 1;
  /** Metres of room on the better flank, and on the worse one. */
  private laneRoom = 0;
  private laneRoomBoth = 0;

  /**
   * The bearing out of `from`, nearest the one preferred, with the longest run
   * of walkable ground in the sun; the run length lands in `laneRange`.
   *
   * A marching shot needs somewhere to march. Taking the sun's bearing on
   * faith and ordering four men down it walks them into a wall, whereupon
   * their paths fail, the tree takes them back, and they scatter. And a
   * walkable lane is not enough on its own: this town has covered markets and
   * arcades whose floors read as black at midday, and men fighting across one
   * photograph as silhouettes standing on nothing.
   *
   * `elbow` metres of room across the lane is the third requirement, and it is
   * the one that decides where the camera can stand. The longest run of open
   * sunlit ground in this town is an alley six metres wide, and a file of four
   * marching up an alley cannot be photographed from the side at any distance
   * — the broadside bearing is inside a building. The sweep then gives up the
   * bearing it was asked for and shoots up the lane instead, which is four
   * backs walking away. A slightly shorter lane with room beside it is worth
   * far more than the longest one.
   */
  private openLane(from: THREE.Vector3, prefer: number, want: number, elbow = 0): number {
    const world = this.world;
    this.laneRange = want;
    if (!world) return prefer;
    let bestBearing = prefer;
    let best = -Infinity;
    for (let i = 0; i < SWINGS.length; i++) {
      const bearing = prefer + SWINGS[i];
      const sx = Math.sin(bearing);
      const sz = Math.cos(bearing);
      let run = 0;
      let lit = 0;
      let samples = 0;
      for (let d = 2; d <= want; d += 2) {
        const x = from.x + sx * d;
        const z = from.z + sz * d;
        if (!world.isWalkable(x, z)) break;
        run = d;
        _lit.set(x, world.terrainHeight(x, z) + 1.2, z);
        if (this.openSky(_lit)) lit++;
        samples++;
      }
      // Room to stand back on the better flank, measured a third of the way
      // along the run — where the file will be when the shutter opens.
      //
      // Measured by casting at lens height rather than by asking the world
      // where a man could walk. The walkability grid is the wrong question and
      // gives the wrong answer: the ground beside every lane in this town is
      // loading docks, plinths and rubble, none of which is walkable and all of
      // which a camera can perfectly well stand on. Asked that way the probe
      // returned nought metres of room on both flanks of every bearing, the
      // term dropped out of the score entirely, and the shot came back up the
      // alley however heavily the term was weighted.
      let room = 0;
      let side = 1;
      let both = 0;
      if (elbow > 0 && run > 4) {
        const mx = from.x + sx * run * 0.34;
        const mz = from.z + sz * run * 0.34;
        // Chest height, matching the height the camera sweep's own visibility
        // probe insists on, so the two cannot disagree about the same gap.
        _lane.set(mx, world.terrainHeight(mx, mz) + SIGHT_HEIGHTS[1], mz);
        for (let s = -1; s <= 1; s += 2) {
          _laneOut.set(-sz * s, 0, sx * s);
          const wall = this.physics?.raycast(_lane, _laneOut, elbow + 1, SKY_MASK);
          const out = wall ? wall.distance : elbow + 1;
          both = Math.min(both === 0 ? out : both, out);
          if (out <= room) continue;
          room = out;
          side = s;
        }
      }
      // Room across the lane, when a caller asks for any, outweighs the length
      // of it several times over. Length was the leading term, and the longest
      // sunlit walkable run in this town is a six-metre alley: the squad
      // marched up it correctly, and there was nowhere within twenty-six
      // degrees of broadside to stand, on their own floor, that could see
      // them. The sweep then spent its last pass and came back with four backs
      // photographed from a roof. Ten metres of march is a gait; the rest is a
      // longer walk to the same picture, so the extra length is worth very
      // little and the elbow room is worth almost everything.
      const score =
        run +
        (samples > 0 ? (lit / samples) * 14 : 0) +
        Math.min(room, elbow) * 6 -
        Math.abs(SWINGS[i]) * 2.5;
      if (score <= best) continue;
      best = score;
      bestBearing = bearing;
      this.laneRange = run;
      this.laneSide = side;
      this.laneRoom = room;
      this.laneRoomBoth = both;
    }
    return bestBearing;
  }

  /** A soldier standing on his own, close enough to judge the model. */
  private sceneSoldier(): void {
    this.clear();
    const face = this.front() + 0.62;
    // Stand him where the sun is, not where the anchor happens to be. Measured
    // at the anchor: not one of the three heights up his body sees the sun, so
    // he photographed as a pale cut-out against a wall that was fully lit.
    this.sunnySpot(this.anchor, 9, this.portrait);
    this.orbit(_v, this.portrait, face, 14, 0);
    this.setTarget(_v.x, this.portrait.y, _v.z);
    const id = this.ai.spawn(this.portrait, face);
    const agent = this.ai.byId(id);
    if (agent) {
      agent.profile = { ...agent.profile, reactionTime: 0.05 };
      // Give him a contact so he shoulders the rifle and looks at something.
      agent.perception.share(this.target.position, this.target.velocity);
      agent.perception.awareness = 1.2;
    }
    this.advance(1.6);
  }

  /**
   * Moves the contact so the man engaging it stands three-quarters on to a
   * camera at `bearing`, and gives him long enough to turn.
   *
   * Which way he faces is set by where the target is, and where the camera can
   * stand is set by the town, and the two are decided in that order — so the
   * portrait is aimed at whichever aspect of him the buildings happen to
   * leave a view of. Both close shots came back as studies of a man's back.
   * Pointing him after the fact costs a second of simulation and settles it.
   *
   * Half a radian off the lens is not enough of a turn. A man aiming a rifle
   * has both arms folded round it in front of his chest, and from anywhere
   * near head-on the whole assembly — arms, hands, weapon — foreshortens into
   * the torso silhouette; the first version of this photographed what looked
   * for all the world like a soldier with no arms, and the fault was the angle
   * rather than the skinning. Fifty-odd degrees puts the rifle across him and
   * both elbows outside his outline.
   *
   * Order matters and cost two drafts to get right. He is frozen and moved into
   * the light *first*, and only then turned: the turn is a bearing measured from
   * wherever he is standing, so moving him afterwards points him at nothing, and
   * every second of simulation spent turning him is a second he spends walking
   * back off the light. Nothing may run him after this but the rig.
   */
  private faceLens(bearing: number): void {
    const subject = this.firstAgent();
    if (!subject) return;
    this.standAtTheReady();
    // The tree walks him a metre or two looking for an angle while it runs, and
    // the shadow edge here is close enough that a metre and a half of it left
    // him with the sun on his helmet and nothing else.
    if (this.sunnySpot(subject.position, 7, _v2)) {
      subject.position.copy(_v2);
      subject.velocity.set(0, 0, 0);
    }

    // Which of the two three-quarter views to take is decided by the sun.
    //
    // Either sign is a three-quarter view and the first draft always took the
    // same one, which turned the man's front 54 degrees away from a lens that
    // was itself standing on the sun's bearing — so his chest, his vest, his
    // pouches and his face were all in his own shade while his back was lit.
    // The photograph read as a study of a soldier's back. Turning him onto
    // whichever side the sun is on costs nothing and lights the half of him
    // the shot exists to show; the vantage offsets its preferred bearing off
    // the sun by half a radian so that the two sides are not a tie.
    const sun = this.sunBearing();
    const turn =
      Math.abs(angleDelta(bearing + 0.95, sun)) <= Math.abs(angleDelta(bearing - 0.95, sun))
        ? 0.95
        : -0.95;
    this.orbit(_v, subject.position, bearing + turn, 14, 0);
    this.setTarget(_v.x, subject.position.y, _v.z);
    this.aimHeldAt(this.target.position);
    // Long enough for the rig to damp out of whatever it was doing and settle
    // the aim. He is held, so this moves the skeleton and nothing else.
    this.advance(1.1);
  }

  /**
   * Freezes every live agent standing, rifle up, aimed at the contact.
   *
   * Only the portrait uses this, and only after the tree has driven him into
   * contact — the pose is the AI's, and this stops it changing under the
   * shutter. The soldier the sweep found was crouched in low cover, which is
   * the right thing for him to do and the wrong thing to photograph: a man
   * folded up behind a wall shows neither the hips the shot exists to inspect
   * nor most of his kit, and which of three hundred cover points he claims
   * decides the pose differently on every run.
   *
   * Holding him is what makes it stick. The capture harness steps six more
   * frames after posing the camera, the tree runs in every one of them, and a
   * stance set here without the hold is back in cover before the shutter
   * opens.
   */
  private standAtTheReady(): void {
    for (const a of this.ai.agentList) {
      if (!a.active || !a.alive) continue;
      a.clearPath();
      a.stop();
      a.stance = STANCE_STAND;
      a.inCover = false;
      a.releaseCover();
      a.aiming = true;
      a.lookWeight = 1;
      a.holdFire();
      a.scripted = true;
      a.hold = true;
    }
  }

  /** Points every held agent at a place, without letting them walk to it. */
  private aimHeldAt(at: THREE.Vector3): void {
    for (const a of this.ai.agentList) {
      if (!a.active || !a.alive) continue;
      a.aimPoint.copy(at);
      a.aimPoint.y += 1.05;
      a.desiredHeading = Math.atan2(at.x - a.position.x, at.z - a.position.z);
    }
  }

  /** Four men crossing open ground toward a contact, so the gait is legible. */
  private sceneSquad(): void {
    this.clear();
    // Down the longest open lane that still faces roughly across the sun, so
    // the stride is side-on to the camera: a man walking straight down the lens
    // has no gait to look at.
    const march = this.openLane(this.anchor, this.front() + 1.15, 16, 9);
    const dirX = Math.sin(march);
    const dirZ = Math.cos(march);
    const range = Math.max(6, this.laneRange - 3);
    this.setTarget(this.anchor.x + dirX * 34, this.anchor.y, this.anchor.z + dirZ * 34);
    // Broadside, on whichever flank the camera can actually stand on.
    //
    // Light chose the flank before, and light is the wrong tiebreak when only
    // one of the two flanks exists. The lane search measures both sides; on
    // the street this shot kept picking there were ten metres of room on one
    // and eighty centimetres on the other, and the sunward one was the wall.
    // Every bearing within forty degrees of that broadside was then either
    // inside a building or looking at it, the sweep spent its last pass, and
    // the shot came back at eighty degrees off — ten degrees from straight up
    // the lane, four men walking away.
    //
    // The sun still decides it when both flanks are open enough to shoot from.
    const flanks = [march - (Math.PI / 2) * this.laneSide, march + (Math.PI / 2) * this.laneSide];
    const sun = this.sunBearing();
    this.squadView =
      this.laneRoomBoth >= 7 && Math.cos(sun - flanks[1]) > Math.cos(sun - flanks[0])
        ? flanks[1]
        : flanks[0];

    const goals: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      // Staggered file: two ranks offset across the line of advance, which is
      // both how it is done and how you see four men at once rather than one
      // man three deep.
      //
      // Tighter than it was. Two ranks two and a half metres apart, with four
      // men spread over five, is a group whose near man and far man are at
      // very different bearings from any one camera position: the clustering
      // step threw two of them out for being more than its radius from the
      // rest, the sweep framed the two that were left, and no broadside
      // position could hold even those. Half the depth keeps the file inside
      // one frame and still reads as a stagger rather than a rank.
      const lead = (i % 2) * 1.4;
      const side = (i - 1.5) * 1.55;
      _v.set(
        this.anchor.x + dirX * lead - dirZ * side,
        this.anchor.y,
        this.anchor.z + dirZ * lead + dirX * side,
      );
      this.world?.nearestNavPoint(_v, _v);
      const id = this.ai.spawnDetailed(_v, march, 'regular', 0);
      const agent = this.ai.byId(id);
      const goal = new THREE.Vector3(
        this.anchor.x + dirX * range - dirZ * side,
        this.anchor.y,
        this.anchor.z + dirZ * range + dirX * side,
      );
      this.world?.nearestNavPoint(goal, goal);
      goals.push(goal);
      if (agent) {
        agent.perception.share(this.target.position, this.target.velocity);
        agent.perception.awareness = 0.9;
      }
    }

    // Hold the file. Left to the tree one man breaks for cover, another flanks
    // wide, and by the time the shutter opens the four of them are twenty
    // metres apart with a building in the middle — correct behaviour, and not
    // the photograph this shot exists to take. So the tree is stood down and
    // the order re-issued as they go, because a path that fails hands the agent
    // straight back to it.
    //
    // The contact is re-shared each time round for the same reason: awareness
    // decays, a squad with nothing to be aware of lowers its weapons and goes
    // back to patrolling, and the shot wants four men advancing to contact.
    for (let step = 0; step < 4; step++) {
      let i = 0;
      for (const a of this.ai.agentList) {
        if (!a.active || i >= goals.length) continue;
        a.scripted = true;
        a.perception.share(this.target.position, this.target.velocity);
        a.perception.awareness = 1.1;
        a.pathTo(goals[i], AI.runSpeed * 0.62, 0.7);
        i++;
      }
      // Long enough in total that everybody is mid-stride, not accelerating,
      // and short enough that the file has not walked itself apart. At two and
      // a half metres a second a man covers seven metres in three seconds, and
      // four men who each round a different corner of the same crate arrive
      // strung out over more ground than one lens can hold.
      this.advance(0.4);
    }
  }

  /** One man behind cover, caught leaning out. */
  private sceneCover(): void {
    this.clear();
    const cover = this.bestCover(this.anchor, 22);
    const at = cover ? cover.position : this.anchor;
    // Stand the target on the side the cover protects against.
    if (cover) {
      _v.copy(cover.position).addScaledVector(cover.normal, 15);
      this.setTarget(_v.x, this.anchor.y, _v.z);
    } else {
      this.setTarget(this.anchor.x + 15, this.anchor.y, this.anchor.z);
    }
    // Watch from downrange, swung to whichever flank the sun is on. The cover's
    // own normal decides the shot here rather than the sun alone, because a
    // camera on the wrong side of a wall photographs the wall.
    const outward = cover ? Math.atan2(cover.normal.x, cover.normal.z) : 0;
    const swing = Math.cos(this.sunBearing() - (outward + 0.8)) >= Math.cos(this.sunBearing() - (outward - 0.8))
      ? 0.8
      : -0.8;
    this.coverView = outward + swing;
    // On the cover point, not three metres behind it. Spawning him short and
    // trusting the tree to walk him in makes the shot depend on which of three
    // hundred cover points his own scoring likes best, and the first version
    // of this photographed a man twenty-three metres away who had given up and
    // gone back to patrolling.
    _v2.copy(at);
    const id = this.ai.spawn(_v2, outward);
    // Keep the contact alive. The stand-in target does not move or shoot, so a
    // soldier is quite right to lose interest in it — correct behaviour and the
    // wrong photograph.
    for (let i = 0; i < 26; i++) {
      const a = this.ai.byId(id);
      if (!a) break;
      a.perception.share(this.target.position, this.target.velocity);
      a.perception.awareness = 1.3;
      if (a.inCover && i > 2) break;
      this.advance(0.4);
    }
    // Hold the peek open for the photograph rather than catching the duck.
    const a = this.ai.byId(id);
    if (a) {
      a.peekTime = 0.2;
      a.duckTimer = 0;
    }
    this.advance(0.1);
  }

  /** A corpse that has finished falling. */
  private sceneRagdoll(): void {
    this.clear();
    // Shot from the camera's side, so he falls away rather than onto the lens,
    // and with a rifle round rather than the 500-damage sledgehammer the first
    // draft used — the blood volume scales with the wound and a headshot puts a
    // cloud between the camera and the thing being inspected.
    const face = this.front();
    this.orbit(_v, this.anchor, face, 6, 0);
    this.setTarget(_v.x, this.anchor.y, _v.z);
    const id = this.ai.spawn(this.anchor, face);
    const agent = this.ai.byId(id);
    this.advance(0.6);
    if (agent) {
      _v.copy(this.target.position);
      _v.y += 1.15;
      agent.takeDamage(500, _v, false, 'rifle');
    }
    // The ragdoll settles itself and drops its bodies; give it the time.
    this.advance(4.5);
  }

  /** Eight men against a target that shoots back, for the whole picture. */
  private sceneFirefight(): void {
    this.clear();
    this.setTarget(this.anchor.x, this.anchor.y, this.anchor.z);
    this.returnFireOn = true;
    // All eight on the far side of the target from the camera, so the shot
    // contains the firefight instead of the empty street behind it — and down
    // the open, sunlit lane rather than into whatever the sun's bearing
    // happens to point at, which here was a covered market whose floor
    // photographs as a black hole with eight men standing in it.
    const away = this.openLane(this.anchor, this.front() + Math.PI, 24);
    this.fightView = away + Math.PI;
    const reach = Math.max(10, Math.min(this.laneRange - 2, 15));
    const difficulties = ['regular', 'veteran', 'regular', 'recruit', 'veteran', 'regular', 'elite', 'regular'];
    for (let i = 0; i < 8; i++) {
      const angle = away + ((i / 7) - 0.5) * 0.62;
      const radius = reach - (i % 3) * 2.2;
      this.orbit(_v, this.anchor, angle, radius, 0);
      this.world?.nearestNavPoint(_v, _v);
      const id = this.ai.spawnDetailed(_v, angle + Math.PI, difficulties[i], i < 4 ? 0 : 1);
      const agent = this.ai.byId(id);
      if (agent) {
        agent.perception.share(this.target.position, this.target.velocity);
        agent.perception.awareness = 1.2;
      }
    }
    // Long enough that they have found cover and started shooting, short
    // enough that they are still in the same street. Given five and a half
    // seconds the squad does its job properly, two of them are round the back
    // of a building, and there is no lens wide enough to hold what is left.
    this.advance(2.4);
  }

  /**
   * Walkable ground roughly `range` metres from an agent that he can actually
   * see, tested with the same line-of-sight query his eyes use.
   *
   * Picking a firing line by casting one horizontal ray and calling whatever
   * it misses "open" is how a shooting test ends up measuring the perception
   * system: a ray at eye height clears a window sill that the man's chest does
   * not, and the soldier then spends the whole test looking at a wall.
   */
  private openGroundFor(agent: Agent, range: number, out: THREE.Vector3): boolean {
    const physics = this.physics;
    agent.eyePosition(_v);
    // Range outermost: every bearing is tried at the distance asked for before
    // any is tried closer, so a caller that wants a twenty metre firing line
    // gets one rather than the first bearing that happens to be open at eight.
    for (let r = range; r >= 7; r -= 2.5) {
      for (let i = 0; i < 64; i++) {
        // Golden-angle sweep, so successive samples land on opposite bearings
        // instead of crawling round the compass one degree at a time.
        const angle = ((i * 0.6180339887) % 1) * Math.PI * 2;
        _probe.set(
          agent.position.x + Math.cos(angle) * r,
          agent.position.y,
          agent.position.z + Math.sin(angle) * r,
        );
        this.world?.nearestNavPoint(_probe, _probe);
        const flat = Math.hypot(_probe.x - agent.position.x, _probe.z - agent.position.z);
        if (flat < r - 3 || flat > r + 3) continue;
        _v3.set(_probe.x, _probe.y + 1.1, _probe.z);
        if (physics && !physics.lineOfSight(_v, _v3, agent.ignoreList)) continue;
        out.copy(_probe);
        return true;
      }
    }
    return false;
  }

  /**
   * Cover worth photographing a man behind: near the anchor, in the sun, with
   * somewhere to shoot at.
   *
   * Nearest-first picked the inside face of a courtyard wall, which is a
   * perfectly good place to fight from and a photograph of a man standing in
   * shade with his back to two hundred square metres of render. Low cover is
   * worth a detour on top of that — a man behind a chest-high wall is visibly
   * behind it, where a man at the corner of a building is just a man.
   */
  private bestCover(near: THREE.Vector3, radius: number): CoverPoint | null {
    const world = this.world;
    if (!world) return null;
    let best: CoverPoint | null = null;
    let bestScore = -Infinity;
    for (const point of world.coverPoints) {
      const d = Math.sqrt(point.position.distanceToSquared(near));
      if (d > radius) continue;
      _lit.copy(point.position).addScaledVector(point.normal, 3.5);
      _lit.y += 1.3;
      const downrange = world.isWalkable(_lit.x, _lit.z) && this.openSky(_lit);
      _v3.copy(point.position).setY(point.position.y + 1.3);
      const score =
        -d * 1.4 + (this.openSky(_v3) ? 22 : 0) + (downrange ? 16 : 0) + (point.low ? 9 : 0);
      if (score <= bestScore) continue;
      bestScore = score;
      best = point;
    }
    return best;
  }

  private nearestCover(near: THREE.Vector3, radius: number): CoverPoint | null {
    const world = this.world;
    if (!world) return null;
    let best: CoverPoint | null = null;
    let bestD = radius * radius;
    for (const point of world.coverPoints) {
      const d = point.position.distanceToSquared(near);
      if (d < bestD) {
        bestD = d;
        best = point;
      }
    }
    return best;
  }

  /* -------------------------------- vantages -------------------------------- */

  private registerShots(): void {
    const shot = (
      name: string,
      note: string,
      setup: () => void,
      place: (camera: THREE.Vector3, look: THREE.Vector3, fov: number) => void,
      fov = 42,
    ) => ({
      name,
      note,
      position: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      fov,
      hideViewmodel: true,
      setup: function (this: { position: THREE.Vector3; lookAt: THREE.Vector3 }) {
        setup();
        place(this.position, this.lookAt, fov);
      },
    });

    registerVantages([
      shot(
        'ai_soldier',
        'One soldier close up: kit, proportions, skinning at shoulders and hips.',
        () => this.sceneSoldier(),
        (camera, look, fov) => {
          // 3.4 m at 40 degrees puts the whole man in frame with air above the
          // helmet; the first draft framed him from 2.3 m and cut his head off.
          const opts = {
            // Off the sun's own bearing by half a radian, so that the man can
            // be turned three-quarters to the lens and still have the sun on
            // his front rather than his back. See `faceLens`.
            prefer: this.front() + 0.5,
            dist: 3.4,
            // Capped, because a portrait has one subject and every bearing sees
            // the same single man: the sweep cannot buy another one by moving,
            // so the only thing left for it to buy is light, and it will happily
            // pay five metres of standoff for a patch of sun to stand in. Which
            // it did, and the study of a soldier became a soldier in a street.
            cap: 4.2,
            height: 1.15,
            focusLift: 0.98,
            swing: 1.05,
            fov,
          };
          // Find the bearing, turn him onto it, then hold it: re-running the
          // sweep freely afterwards lets it settle on a different bearing from
          // the one he was just pointed at, which is how the second draft of
          // this shot managed to photograph his back on purpose.
          opts.prefer = this.viewpoint(camera, look, opts);
          this.faceLens(opts.prefer);
          opts.swing = 0;
          this.viewpoint(camera, look, opts);
        },
        40,
      ),
      shot(
        'ai_squad',
        'Four men advancing: gait, foot plant, spacing.',
        () => this.sceneSquad(),
        (camera, look, fov) => {
          // Close and wide rather than far and narrow: ten metres of clear
          // street on an arbitrary bearing is not something a town guarantees,
          // and every metre the camera has to back off is a metre of wall it
          // might have to swing around, giving up the light to do it.
          this.viewpoint(camera, look, {
            prefer: this.squadView,
            dist: 7.5,
            height: 2.1,
            focusLift: 1.05,
            cap: 11,
            // Wide enough to hold the whole file. At six metres the clustering
            // step was dropping half the squad, and a sweep asked to frame two
            // men will happily stand somewhere that cannot see the other two.
            cluster: 9,
            // Near enough to broadside that the file cannot turn into a queue.
            // Given a free choice the sweep found it could fit all four men
            // into a narrow cone by standing behind them and shooting down the
            // lane, which frames four backs and no gait at all. Forty degrees
            // rather than twenty-five, because at twenty-five there were runs
            // where nothing at all qualified and the last pass — which has no
            // limit — went to a hundred and nine.
            swing: 0.7,
            fov,
          });
        },
        52,
      ),
      shot(
        'ai_cover',
        'An enemy leaning out of cover to fire.',
        () => this.sceneCover(),
        (camera, look, fov) => {
          // Downrange and off to one side: from straight in front the cover
          // hides him, and from behind there is nothing to see but his back.
          this.viewpoint(camera, look, {
            prefer: this.coverView,
            dist: 4.6,
            height: 1.75,
            focusLift: 1.2,
            swing: 0.55,
            fov,
          });
        },
        42,
      ),
      shot(
        'ai_ragdoll',
        'A corpse after the ragdoll has settled.',
        () => this.sceneRagdoll(),
        (camera, look, fov) => {
          const rag = this.firstAgent()?.ragdoll ?? null;
          const at = rag ? rag.pos[P_PELVIS] : this.anchor;
          // A corpse is a metre of ground clutter, so the probe clears it at
          // waist height rather than the head height a standing man needs.
          //
          // Looked down on, not along. The note here used to say the opposite —
          // that a body only resolves into a man seen roughly along the ground
          // — and measuring the settled pose is what overturned it: a chain of
          // point masses has no volume to hold a chest off the floor, so a
          // corpse is barely a foot of relief spread over a metre and two
          // thirds, and a flat thing seen edge-on is a row of tubes. From above
          // it is unmistakably the plan of a man.
          //
          // Capped hard, and the swing with it. A corpse is one subject, so
          // every bearing sees the same single man and the sweep decides on
          // light alone — which it will happily buy by walking backwards into
          // the sun until the body is a smudge eight metres down the street.
          this.viewpoint(camera, look, {
            prefer: this.broadside(rag, this.front() + 0.5),
            dist: 2.4,
            cap: 2.7,
            swing: 1.1,
            height: 2.3,
            lift: 0.85,
            focusLift: 0.15,
            tall: 0.9,
            only: at,
            fov,
          });
        },
        44,
      ),
      shot(
        'ai_firefight',
        'Eight enemies engaging: muzzle flashes, cover, movement.',
        () => this.sceneFirefight(),
        (camera, look, fov) => {
          // Standing behind the target, close and low, and framing whichever
          // knot of men is thickest rather than all eight. Fitting all eight
          // is what a firefight refuses to allow: they scatter over forty
          // metres within seconds of contact, the lens goes back to thirty-
          // five, and every soldier in the frame is thirty pixels tall.
          this.viewpoint(camera, look, {
            prefer: this.fightView,
            dist: 9,
            height: 2.2,
            fit: 1.25,
            cap: 13,
            cluster: 6,
            focusLift: 1.2,
            fov,
          });
        },
        56,
      ),
    ]);
  }

  private firstAgent(): Agent | null {
    for (const a of this.ai.agentList) if (a.active) return a;
    return null;
  }

  /**
   * The bearing across a corpse's torso, on whichever side of it is closer to
   * `prefer`.
   *
   * Where a body ends up pointing is the one thing about this shot nobody
   * chooses: he is thrown by the round that killed him and lands on a bearing
   * the physics picked. Shooting a fixed bearing therefore gets a body across
   * the frame on a good day and, on a bad one, two boot soles filling the
   * bottom of the picture with a man foreshortened to nothing behind them.
   */
  private broadside(rag: RagdollBody | null, prefer: number): number {
    if (!rag) return prefer;
    // The direction the body is longest in, taken over every joint in it.
    //
    // Head to heels was the second attempt and is only right for a corpse that
    // came to rest laid out. Plenty do not: a man dropped on hard ground as
    // often as not settles with his knees folded up under him, which puts his
    // heels back beside his hips and leaves head-to-heels a stub pointing
    // nowhere. The shot then came back down the length of the body, which
    // reads as a heap of parts rather than a man.
    //
    // The principal horizontal axis of all eleven joints does not care what
    // the pose is. It is the eigenvector of a two by two covariance, which for
    // a symmetric matrix is one atan2 rather than an iteration.
    let sxx = 0;
    let szz = 0;
    let sxz = 0;
    let cx = 0;
    let cz = 0;
    for (let i = 0; i < PARTICLES; i++) {
      cx += rag.pos[i].x;
      cz += rag.pos[i].z;
    }
    cx /= PARTICLES;
    cz /= PARTICLES;
    for (let i = 0; i < PARTICLES; i++) {
      const dx = rag.pos[i].x - cx;
      const dz = rag.pos[i].z - cz;
      sxx += dx * dx;
      szz += dz * dz;
      sxz += dx * dz;
    }
    // Degenerate only when the body is a point, which a settled corpse is not.
    if (sxx + szz < 0.02) return prefer;
    const spin = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    // The eigenvector is (cos spin, sin spin) over (x, z); as a bearing that is
    // atan2 of its x over its z. Which end of the body it points at is
    // arbitrary and does not matter, because both perpendiculars are tried.
    const axis = Math.atan2(Math.cos(spin), Math.sin(spin));
    const left = axis + Math.PI / 2;
    const right = axis - Math.PI / 2;
    return Math.abs(angleDelta(left, prefer)) <= Math.abs(angleDelta(right, prefer)) ? left : right;
  }

  private centroid(out: THREE.Vector3): THREE.Vector3 {
    out.set(0, 0, 0);
    let n = 0;
    for (const a of this.ai.agentList) {
      if (!a.active) continue;
      out.add(a.position);
      n++;
    }
    if (n > 0) out.multiplyScalar(1 / n);
    else out.copy(this.anchor);
    return out;
  }

  /* --------------------------------- frame ---------------------------------- */

  update(dt: number): void {
    if (!this.returnFireOn) return;
    // The scripted target shoots back, because suppression is half the
    // behaviour and it cannot be photographed without incoming fire.
    this.returnFire -= dt;
    if (this.returnFire > 0) return;
    this.returnFire = 0.11;
    let victim: Agent | null = null;
    let best = Infinity;
    for (const a of this.ai.agentList) {
      if (!a.active || !a.alive) continue;
      const d = a.position.distanceToSquared(this.target.position);
      if (d < best) {
        best = d;
        victim = a;
      }
    }
    if (!victim) return;
    _v.copy(this.target.eye);
    _v2.copy(victim.position);
    _v2.y += 1.1;
    _v2.sub(_v).normalize();
    this.ai.suppressAlong(_v, _v2, 60);
    this.ai.broadcastSound(_v, AI.loudness.playerShot);
    this.ctx.events.emit('fx:tracer', {
      origin: _v,
      end: _v2.multiplyScalar(40).add(_v),
      speed: 880,
      caliber: 0.00556,
      fromPlayer: true,
    });
  }

  /* --------------------------------- hooks ---------------------------------- */

  private install(): void {
    const ai = this.ai;
    const self = this;

    const describe = (a: Agent) => ({
      id: a.id,
      name: a.name,
      alive: a.alive,
      health: a.health,
      position: [a.position.x, a.position.y, a.position.z],
      heading: a.heading,
      stance: a.stance,
      state: ai.brainTree.leaf(a),
      trace: ai.brainTree.trace(a),
      role: ROLE_NAMES[a.role] ?? 'idle',
      squad: a.squad ? a.squad.id : -1,
      difficulty: a.profile.name,
      awareness: a.perception.awareness,
      visible: a.perception.visible,
      contact: a.perception.contact,
      lastKnown: [
        a.perception.lastKnown.x,
        a.perception.lastKnown.y,
        a.perception.lastKnown.z,
      ],
      lastKnownAge: a.perception.lastKnownAge,
      suppression: a.suppression,
      magazine: a.magazine,
      reloading: a.reloading,
      cover: a.coverIndex,
      coverScore: a.coverScore,
      coverDistance: a.coverDistance,
      atCover: a.atCover(),
      inCover: a.inCover,
      peeking: a.peekTime > 0,
      spread: a.aimSpread(),
      ragdoll: a.ragdoll ? a.ragdoll.active : false,
      settled: a.ragdoll ? a.ragdoll.settled : false,
      lod: a.lod,
      /* movement and gunnery internals, for diagnosing a stuck or silent agent */
      velocity: [a.velocity.x, a.velocity.y, a.velocity.z],
      goal: [a.goal.x, a.goal.y, a.goal.z],
      hasGoal: a.hasGoal,
      pathState: a.pathState,
      pathWhy: a.pathWhy,
      pathCount: a.path.count,
      pathIndex: a.pathIndex,
      waypoint: a.pathIndex < a.path.count ? (a.path.point(a.pathIndex, _v), [_v.x, _v.y, _v.z]) : null,
      stuck: a.stuckFor,
      arrived: a.arrived,
      distanceToGoal: a.distanceToGoal,
      arriveRadius: a.arriveRadius,
      scripted: a.scripted,
      reaction: a.reaction,
      engageTime: a.engageTime,
      wantsFire: a.wantsFire,
      shots: a.shots,
    });

    const api = {
      /* ---- population ---- */
      spawn(x: number, y: number, z: number, heading = 0, difficulty = '', squad = -1): number {
        _v.set(x, y, z);
        return difficulty || squad >= 0
          ? ai.spawnDetailed(_v, heading, difficulty || 'regular', squad)
          : ai.spawn(_v, heading);
      },
      killAll: () => ai.killAll(),
      clear: () => self.clear(),
      count: () => ai.aliveCount,
      ids: () => ai.agentList.filter((a) => a.active).map((a) => a.id),
      agent: (id: number) => {
        const a = ai.byId(id);
        return a ? describe(a) : null;
      },
      agents: () => ai.agentList.filter((a) => a.active).map(describe),

      /* ---- the simulated player ---- */
      setPlayer(x: number, y: number, z: number, vx = 0, vy = 0, vz = 0): void {
        self.setTarget(x, y, z);
        self.target.velocity.set(vx, vy, vz);
      },
      playerAlive(alive: boolean): void {
        self.target.alive = alive;
      },
      playerCrouched(crouched: boolean): void {
        self.target.crouched = crouched;
      },
      playerDamage: () => ({
        total: self.target.scriptedDamage,
        hits: self.target.scriptedHits,
      }),
      resetPlayerDamage(): void {
        self.target.scriptedDamage = 0;
        self.target.scriptedHits = 0;
      },
      returnFire(on: boolean): void {
        self.returnFireOn = on;
      },

      /* ---- time ---- */
      step: (seconds: number) => self.advance(seconds),
      stepFrames: (frames: number) => self.advance(frames / 60),

      /* ---- forcing behaviour ---- */
      force(id: number, state: string): boolean {
        const a = ai.byId(id);
        if (!a) return false;
        switch (state) {
          case 'contact':
            a.perception.share(self.target.position, self.target.velocity);
            a.perception.awareness = 1.2;
            a.reaction = 0;
            return true;
          case 'engage':
            a.perception.share(self.target.position, self.target.velocity);
            a.perception.awareness = 1.3;
            a.reaction = 0;
            a.magazine = AI.weapon.magSize;
            return true;
          case 'reload':
            a.magazine = 0;
            return true;
          case 'grenade':
            a.grenadeCooldown = 0;
            a.bt.timer.fill(0);
            a.perception.share(self.target.position, self.target.velocity);
            a.perception.awareness = 1.3;
            return true;
          case 'flee':
            a.health = 4;
            return true;
          case 'suppressed':
            a.suppress(1.2);
            return true;
          case 'crouch':
            a.stance = STANCE_CROUCH;
            return true;
          case 'prone':
            a.stance = STANCE_PRONE;
            return true;
          case 'stand':
            a.stance = STANCE_STAND;
            return true;
          case 'idle':
            a.perception.reset();
            a.bt.reset();
            return true;
          // Stand him up and stop him, so a pose can be looked at or measured.
          case 'hold':
            a.perception.reset();
            a.bt.reset();
            a.clearPath();
            a.stance = STANCE_STAND;
            a.scripted = true;
            a.hold = true;
            return true;
          case 'release':
            a.hold = false;
            a.scripted = false;
            return true;
          default:
            return false;
        }
      },
      moveTo(id: number, x: number, y: number, z: number): boolean {
        const a = ai.byId(id);
        if (!a) return false;
        _v.set(x, y, z);
        a.perception.reset();
        a.bt.reset();
        // An ordered move outranks the tree, which would otherwise decide two
        // frames later that it would rather patrol.
        a.scripted = true;
        a.pathTo(_v, AI.runSpeed, 0.8);
        return true;
      },
      damage(id: number, amount: number, headshot = false): boolean {
        const a = ai.byId(id);
        if (!a) return false;
        _v.copy(self.target.eye);
        return ai.damage(id, {
          amount,
          kind: 'bullet',
          from: _v,
          headshot,
          attacker: 'player',
          targetId: id,
        });
      },
      damageRadius: (x: number, y: number, z: number, radius: number, max: number) =>
        ai.damageRadius(_v.set(x, y, z), radius, max, 'test'),

      /** Somewhere this agent has a clear shot at, for scripting a firefight. */
      openGround(id: number, range = 20): number[] | null {
        const a = ai.byId(id);
        if (!a) return null;
        return self.openGroundFor(a, range, _v2) ? [_v2.x, _v2.y, _v2.z] : null;
      },

      /* ---- navigation ---- */
      path(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
        _v.set(ax, ay, az);
        _v2.set(bx, by, bz);
        const id = ai.nav.request(-99, _v, _v2, self.probe);
        if (id < 0) return null;
        // Run it to completion here; the amortised budget is a frame-time
        // measure, not a correctness one.
        for (let i = 0; i < 200 && ai.nav.pending > 0; i++) ai.nav.pump(20000, 4);
        const out: number[][] = [];
        for (let i = 0; i < self.probe.count; i++) {
          self.probe.point(i, _v);
          out.push([_v.x, _v.y, _v.z]);
        }
        return { points: out, length: self.probe.length, complete: self.probe.complete };
      },
      walkable: (x: number, y: number, z: number) => ai.nav.standable(x, y, z, 0.6),
      navStats: () => ({ ...ai.nav.stats, ...ai.nav.describe() }),
      navColumn: (x: number, z: number) => ai.nav.inspect(x, z),
      navSegment: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) =>
        ai.nav.segmentClear(ax, ay, az, bx, by, bz),

      /* ---- cover ---- */
      coverCount: () => ai.coverField.count,
      coverClaims: () => {
        const out: Array<{ index: number; agent: number; at: [number, number, number] }> = [];
        for (let i = 0; i < ai.coverField.count; i++) {
          const owner = ai.coverField.claimedBy(i);
          if (owner < 0) continue;
          const p = ai.coverField.at(i)?.position;
          out.push({ index: i, agent: owner, at: [p?.x ?? 0, p?.y ?? 0, p?.z ?? 0] });
        }
        return out;
      },
      claimCover: (index: number, agentId: number) => ai.coverField.claim(index, agentId),

      /* ---- readouts ---- */
      anchor: () => [self.anchor.x, self.anchor.y, self.anchor.z],
      /** What the last camera sweep settled for. `pass: -1` means it found nothing. */
      sweep: () => ({ ...self.sweep }),
      stats: () => ({ ...ai.stats, ragdollsSimulating: ai.ragdollPool?.simulating ?? 0 }),
      triangles: () => ai.soldierAssets?.triangleReport ?? {},
      enabled: (on: boolean) => self.holdAI(!on),
      bones(id: number) {
        const a = ai.byId(id);
        if (!a) return null;
        return a.bonePos.map((p) => [p.x, p.y, p.z]);
      },
      /** Bone name to index, so a caller never has to hard-code the layout. */
      boneIndex: () => ({ ...B }),
      ragdoll(id: number) {
        const a = ai.byId(id);
        if (!a || !a.ragdoll) return null;
        return {
          active: a.ragdoll.active,
          settled: a.ragdoll.settled,
          age: a.ragdoll.age,
          points: a.ragdoll.pos.map((p) => [p.x, p.y, p.z]),
        };
      },
      scenes: {
        soldier: () => self.sceneSoldier(),
        squad: () => self.sceneSquad(),
        cover: () => self.sceneCover(),
        ragdoll: () => self.sceneRagdoll(),
        firefight: () => self.sceneFirefight(),
      },
    };

    (window as unknown as { __AI__: typeof api }).__AI__ = api;
  }

  dispose(): void {
    this.returnFireOn = false;
    delete (window as unknown as { __AI__?: unknown }).__AI__;
  }
}
