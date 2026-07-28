import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import { Groups } from '../core/GameContext';
import type { CoverPoint, IPhysics, IPlayer, ISky, IWorld } from '../core/Interfaces';
import { angleDelta } from '../core/MathUtils';
import { registerVantages } from '../core/Vantage';
import type AISystem from './AISystem';
import type { Agent } from './Agent';
import { NavPath } from './NavGrid';
import { P_HEAD, P_PELVIS, type RagdollBody } from './Ragdoll';
import { STANCE_CROUCH, STANCE_PRONE, STANCE_STAND } from './SoldierRig';
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

/**
 * Bearings the camera will accept, nearest the one asked for first, and the
 * fractions of the nominal range it will try. Both are swept in full and
 * scored; neither is a bail-out order.
 */
const SWINGS = [0, 0.26, -0.26, 0.52, -0.52, 0.78, -0.78, 1.05, -1.05, 1.4, -1.4, 1.9, -1.9];
const PULLS = [1, 0.82, 0.66, 1.25, 1.55];

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
    const steps = Math.min(1200, Math.max(1, Math.round(seconds / dt)));
    for (let i = 0; i < steps; i++) {
      this.physics?.stepBodies?.(dt);
      this.ai.update(dt, this.ctx);
    }
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
    // Standing clear of the group is not negotiable, and the pull-in factors
    // below will otherwise walk the lens right into the middle of it: a knot
    // of eight with a seven-metre spread, photographed from six metres of its
    // centre, has three men behind the camera and one against the lens.
    const clear = spread + 2.5;
    const range = Math.min(cap, Math.max(dist, spread * fit, clear));

    this.orbit(out, _centre, prefer, range, height);
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
    for (let p = 0; p < PULLS.length; p++) {
      for (let i = 0; i < SWINGS.length; i++) {
        if (Math.abs(SWINGS[i]) > swing) continue;
        const bearing = prefer + SWINGS[i];
        this.orbit(_view, _centre, bearing, Math.max(clear, Math.min(cap, range * PULLS[p])), height);
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
        _acc.set(0, 0, 0);
        let seen = 0;
        let near = 0;
        for (let s = 0; s < n; s++) {
          _look.set(this.subject[s].x, this.subject[s].y + lift, this.subject[s].z);
          // Boots and helmet both, not the chest between them. A chest test
          // passes a man standing three metres off the lens whose head is a
          // long way above the top of the picture, and the firefight came back
          // with exactly that: a soldier cropped at the eyebrows in one corner.
          if (!this.framed(this.subject[s], 0.05, tanH, tanV)) continue;
          if (!this.framed(this.subject[s], tall, tanH, tanV)) continue;
          if (!physics.lineOfSight(_view, _look)) continue;
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
        // A tie between two viewpoints that show the same men goes to the
        // nearer one. Everything above is satisfied by a frame in which the
        // soldiers are forty pixels tall, and that frame is a photograph of a
        // street.
        const score =
          seen * (26 + lit * 84) -
          (near / seen) * 3.5 -
          Math.abs(SWINGS[i]) * 9 -
          Math.abs(1 - PULLS[p]) * 10;
        if (score <= best) continue;
        best = score;
        bestBearing = bearing;
        out.copy(_view);
        focus.copy(_acc).multiplyScalar(1 / seen);
        focus.y += focusLift;
      }
    }
    return bestBearing;
  }

  /** Length of the last lane `openLane` found, in metres. */
  private laneRange = 0;

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
   */
  private openLane(from: THREE.Vector3, prefer: number, want: number): number {
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
      const score = run + (samples > 0 ? (lit / samples) * 14 : 0) - Math.abs(SWINGS[i]) * 2.5;
      if (score <= best) continue;
      best = score;
      bestBearing = bearing;
      this.laneRange = run;
    }
    return bestBearing;
  }

  /** A soldier standing on his own, close enough to judge the model. */
  private sceneSoldier(): void {
    this.clear();
    const face = this.front() + 0.62;
    this.orbit(_v, this.anchor, face, 14, 0);
    this.setTarget(_v.x, this.anchor.y, _v.z);
    const id = this.ai.spawn(this.anchor, face);
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
   */
  private faceLens(bearing: number): void {
    this.orbit(_v, this.anchor, bearing + 0.95, 14, 0);
    this.setTarget(_v.x, this.anchor.y, _v.z);
    for (const a of this.ai.agentList) {
      if (!a.active) continue;
      a.perception.share(this.target.position, this.target.velocity);
      a.perception.awareness = 1.3;
    }
    this.advance(1.1);
  }

  /** Four men crossing open ground toward a contact, so the gait is legible. */
  private sceneSquad(): void {
    this.clear();
    // Down the longest open lane that still faces roughly across the sun, so
    // the stride is side-on to the camera: a man walking straight down the lens
    // has no gait to look at.
    const march = this.openLane(this.anchor, this.front() + 1.15, 26);
    const dirX = Math.sin(march);
    const dirZ = Math.cos(march);
    const range = Math.max(6, this.laneRange - 3);
    this.setTarget(this.anchor.x + dirX * 34, this.anchor.y, this.anchor.z + dirZ * 34);
    // Broadside, on whichever flank is nearer the sun. Asking for the sun's
    // own bearing and hoping got a lane that ran straight down it, and four
    // men in single file walking into the lens: no stride, no spacing, no
    // formation, three of them hidden behind the first.
    const flanks = [march + Math.PI / 2, march - Math.PI / 2];
    const sun = this.sunBearing();
    this.squadView =
      Math.cos(sun - flanks[0]) >= Math.cos(sun - flanks[1]) ? flanks[0] : flanks[1];

    const goals: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      // Staggered file: two ranks a couple of metres apart, offset across the
      // line of advance, which is both how it is done and how you see four men
      // at once rather than one man three deep.
      const lead = (i % 2) * 2.4;
      const side = (i - 1.5) * 1.7;
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
    for (let step = 0; step < 6; step++) {
      let i = 0;
      for (const a of this.ai.agentList) {
        if (!a.active || i >= goals.length) continue;
        a.scripted = true;
        a.perception.share(this.target.position, this.target.velocity);
        a.perception.awareness = 1.1;
        a.pathTo(goals[i], AI.runSpeed * 0.62, 0.7);
        i++;
      }
      // Long enough in total that everybody is mid-stride, not accelerating.
      this.advance(0.45);
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
            prefer: this.front(),
            dist: 3.4,
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
            dist: 8.5,
            height: 2.1,
            focusLift: 1.05,
            cap: 11,
            cluster: 6,
            swing: 0.8,
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
          // waist height rather than the head height a standing man needs, and
          // the camera is kept low: from head height a body on its face is a
          // heap, and it only resolves into a man seen roughly along the ground.
          // Capped hard, and the swing with it. A corpse is one subject, so
          // every bearing sees the same single man and the sweep decides on
          // light alone — which it will happily buy by walking backwards into
          // the sun until the body is a smudge eight metres down the street.
          this.viewpoint(camera, look, {
            prefer: this.broadside(rag, this.front() + 0.5),
            dist: 2.6,
            cap: 2.9,
            swing: 1.1,
            height: 1.35,
            lift: 0.85,
            focusLift: 0.1,
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
    _v.copy(rag.pos[P_HEAD]).sub(rag.pos[P_PELVIS]);
    if (_v.x * _v.x + _v.z * _v.z < 0.01) return prefer;
    const axis = Math.atan2(_v.x, _v.z);
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
        const out: Array<{ index: number; agent: number }> = [];
        for (let i = 0; i < ai.coverField.count; i++) {
          const owner = ai.coverField.claimedBy(i);
          if (owner >= 0) out.push({ index: i, agent: owner });
        }
        return out;
      },
      claimCover: (index: number, agentId: number) => ai.coverField.claim(index, agentId),

      /* ---- readouts ---- */
      anchor: () => [self.anchor.x, self.anchor.y, self.anchor.z],
      stats: () => ({ ...ai.stats, ragdollsSimulating: ai.ragdollPool?.simulating ?? 0 }),
      triangles: () => ai.soldierAssets?.triangleReport ?? {},
      enabled: (on: boolean) => ai.setEnabled(on),
      bones(id: number) {
        const a = ai.byId(id);
        if (!a) return null;
        return a.bonePos.map((p) => [p.x, p.y, p.z]);
      },
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
