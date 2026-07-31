/**
 * The director.
 *
 * Owns the population: who exists, where they come from, and when they stop
 * existing. Everything in here is about the shape of the fight rather than the
 * behaviour of one soldier.
 *
 * **Pooling is the whole design.** Building a soldier means a 22-bone hierarchy,
 * two `SkinnedMesh` bindings and an `Animator`, which is the single most expensive
 * thing this module does. Instances are therefore never thrown away: a dead body
 * that has finished sinking goes back on a free list with its model still attached,
 * and a spawn request prefers a free instance whose model already matches what it
 * wants. Steady-state combat allocates nothing.
 *
 * **Spawns are placed against the camera, not against the map.** A spawn point is
 * only usable if it is far enough away, outside the player's forward cone, and
 * out of line of sight. Al-Rashid Crossing publishes ten enemy points along one
 * edge, which on its own would mean every reinforcement arriving from the same
 * direction, so cover points and nav cells around the player are used as
 * secondary sites once a fight has moved away from the map edge.
 *
 * **Waves are squads, not individuals.** Reinforcements arrive two at a time from
 * the same site, which is what lets `SquadManager` group them into something that
 * fights together rather than four men who happen to be in the same street.
 */
import * as THREE from 'three';
import type { SpawnPoint } from '../core/Contracts';
import { TAU } from '../core/MathUtils';
import { ARCHETYPE_IDS, archetypeOf, type ArchetypeId } from './Archetypes';
import type { Blackboard } from './Blackboard';
import { Enemy } from './Enemy';
import { AvoidanceField } from './Locomotion';
import { SquadManager } from './Squad';
import { BODY, DIRECTOR, FIGHT, HEARING, LOD, RADIO, SIGHT } from './Tuning';
import { SoldierFactory } from './model/Factory';
import type { WeaponShape } from './model/Weapon';
import { nearestWalkable, cellCentreX, cellCentreZ } from './Nav';

/** Which weapon model each archetype carries. */
const SHAPES: Record<ArchetypeId, WeaponShape> = {
  rifleman: 'rifle',
  rusher: 'smg',
  marksman: 'dmr',
  suppressor: 'lmg',
  shotgunner: 'shotgun',
};

/** Closest-first, so the man in the player's face is the one aiming properly. */
const byThreatProximity = (a: Enemy, b: Enemy): number =>
  a.perception.distance - b.perception.distance;

const COS_SPAWN_CONE = Math.cos((DIRECTOR.spawnViewAngleDeg * Math.PI) / 180);
/** Beyond this a spawn is out of the fight and not worth using. */
const MAX_SPAWN_DISTANCE = 96;

const POSITION = /* @__PURE__ */ new THREE.Vector3();
const EYE = /* @__PURE__ */ new THREE.Vector3();
const LOOK = /* @__PURE__ */ new THREE.Vector3();
const CANDIDATE = /* @__PURE__ */ new THREE.Vector3();

export class Director {
  /** Every instance currently in the world, corpses included. */
  readonly all: Enemy[] = [];
  readonly squads = new SquadManager();
  readonly factory = new SoldierFactory();
  readonly avoidance = new AvoidanceField();

  /**
   * On by default: nothing in the engine turns waves on, and a shooter whose
   * enemies have to be requested through a debug call is not a shooter.
   */
  spawningEnabled = true;
  /** Live enemies the director tries to hold. */
  targetAlive = DIRECTOR.targetAlive;
  /** Hard ceiling on live enemies, above which `targetAlive` has no effect. */
  maxAlive = DIRECTOR.maxAlive;

  readonly stats = {
    spawned: 0,
    killed: 0,
    recycled: 0,
    modelsBuilt: 0,
    poolSize: 0,
    spawnRejects: 0,
  };

  private scene: THREE.Scene | null = null;
  private readonly idle: Enemy[] = [];
  /** Scratch list for the engagement token sort. Reused, never reallocated. */
  private readonly ranked: Enemy[] = [];
  private engagementTimer = 0;
  private spawnTimer = 1.5;
  private rotation = 0;
  private lastSiteIndex = -1;

  attach(bb: Blackboard, scene: THREE.Scene): void {
    this.scene = scene;
    this.factory.attach(bb.procgen?.materials ?? null);
  }

  /** Builds the shared geometry so the first firefight does not pay for it. */
  warm(bb: Blackboard): void {
    this.factory.attach(bb.procgen?.materials ?? null);
    this.factory.prebuild();
  }

  get aliveCount(): number {
    let n = 0;
    for (const enemy of this.all) if (enemy.isAlive) n++;
    return n;
  }

  get corpseCount(): number {
    let n = 0;
    for (const enemy of this.all) if (enemy.dying) n++;
    return n;
  }

  /** Agents currently holding an engagement token. */
  get focusedCount(): number {
    let n = 0;
    for (const enemy of this.all) if (enemy.focused) n++;
    return n;
  }

  // =========================================================================
  // Spawning
  // =========================================================================

  /**
   * Creates or recycles one enemy at `position`.
   *
   * `position` is the feet, matching the character controller and the world's
   * spawn points. Returns null only when the scene is not attached or the hard
   * population cap is reached, so a caller can treat null as "not now".
   */
  spawn(
    bb: Blackboard,
    position: THREE.Vector3,
    yaw: number,
    archetypeId?: string,
  ): Enemy | null {
    const scene = this.scene;
    if (!scene) return null;
    if (this.all.length >= this.maxAlive + DIRECTOR.maxCorpses) return null;
    // A non-finite spawn position becomes a non-finite Rapier body translation,
    // which corrupts the broad-phase for the whole session. Callers include the
    // killstreak and debug code, so this is checked rather than assumed.
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      this.stats.spawnRejects++;
      return null;
    }

    const archetype = archetypeOf(archetypeId ?? this.nextArchetypeId());
    const shape = SHAPES[archetype.id];
    const variants = archetype.variants;
    const preferred = variants[bb.rng.int(0, variants.length - 1)] ?? 0;

    const enemy = this.take(bb, preferred, shape, variants);
    POSITION.copy(position);
    this.resolveFooting(bb, POSITION);

    scene.add(enemy.model.root);
    enemy.spawn(bb, POSITION, yaw, archetype.id);
    enemy.squad = this.squads.assign(enemy);
    if (!this.all.includes(enemy)) this.all.push(enemy);
    this.stats.spawned++;

    bb.ctx.events.emit('ai:spawn', { enemyId: enemy.id, position: enemy.feet });
    return enemy;
  }

  /** Pulls an instance off the free list, preferring one that needs no rebuild. */
  private take(
    bb: Blackboard,
    preferredVariant: number,
    shape: WeaponShape,
    allowed: readonly number[],
  ): Enemy {
    // An exact match reuses the model, the skeleton and the animator untouched.
    for (let i = this.idle.length - 1; i >= 0; i--) {
      if (this.idle[i].modelMatches(preferredVariant, shape)) return this.idle.splice(i, 1)[0];
    }
    // Any variant this archetype is allowed to wear is just as good.
    for (let i = this.idle.length - 1; i >= 0; i--) {
      const candidate = this.idle[i];
      for (const variant of allowed) {
        if (candidate.modelMatches(variant, shape)) return this.idle.splice(i, 1)[0];
      }
    }

    const recycled = this.idle.pop();
    const enemy = recycled ?? new Enemy(bb);
    const previous = recycled?.model;
    enemy.attachModel(this.factory.create(preferredVariant, shape), preferredVariant, shape);
    this.stats.modelsBuilt++;
    if (previous) this.factory.release(previous);
    this.stats.poolSize = this.idle.length;
    return enemy;
  }

  /** Round-robin through the archetype weighting table. */
  private nextArchetypeId(): ArchetypeId {
    const id = ARCHETYPE_IDS[this.rotation % ARCHETYPE_IDS.length];
    this.rotation++;
    return id;
  }

  // =========================================================================
  // Waves
  // =========================================================================

  update(dt: number, bb: Blackboard): void {
    this.recycleCorpses(bb);
    this.squads.update(dt, bb);
    this.assignEngagement(dt, bb);

    if (!this.spawningEnabled) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = DIRECTOR.spawnInterval;

    const alive = this.aliveCount;
    const ceiling = Math.min(this.targetAlive, this.maxAlive);
    if (alive >= ceiling) return;
    if (!bb.world || !bb.nav) return;

    const wanted = Math.min(DIRECTOR.spawnBatch, ceiling - alive);
    if (!this.pickSite(bb, CANDIDATE)) {
      this.stats.spawnRejects++;
      // Try again sooner: the player is probably standing on the only usable
      // approach, and a long wait there reads as the map having run out of enemies.
      this.spawnTimer = 0.9;
      return;
    }

    for (let i = 0; i < wanted; i++) {
      const archetype = this.nextArchetypeId();
      POSITION.copy(CANDIDATE);
      if (i > 0) {
        // Spread the squad out around the site so they do not spawn inside each
        // other and spend their first second shoving.
        const angle = bb.rng.range(0, TAU);
        const radius = bb.rng.range(1.1, 2.6);
        if (
          !this.snap(
            bb,
            CANDIDATE.x + Math.cos(angle) * radius,
            CANDIDATE.z + Math.sin(angle) * radius,
            CANDIDATE.y,
            POSITION,
          )
        ) {
          POSITION.copy(CANDIDATE);
        }
      }
      const spawned = this.spawn(bb, POSITION, this.facingPlayer(bb, POSITION), archetype);
      if (!spawned) break;
      // Reinforcements know roughly where the fighting is, which is why they are
      // walking towards it rather than standing at the map edge.
      if (bb.target.alive && bb.target.feet.distanceTo(POSITION) < RADIO.range * 1.6) {
        spawned.perception.receiveContact(bb.target.feet, bb.target.velocity, bb.now);
        spawned.perception.awareness = SIGHT.alertThreshold * 1.1;
      }
      // A marksman is worth putting somewhere with a view.
      if (spawned.archetype.likesElevation) this.sendUpstairs(bb, spawned);
    }
  }

  /**
   * Somewhere to put reinforcements.
   *
   * The map's own enemy spawn points come first, because they are authored and
   * always walkable. When they are all rejected — usually because the fight has
   * moved to the far side of the map and they are eighty metres behind the player
   * — cover points behind the player are used instead, which keeps a firefight
   * fed without ever putting a man in front of the camera.
   */
  private pickSite(bb: Blackboard, out: THREE.Vector3): boolean {
    const world = bb.world;
    if (!world) return false;

    let points: readonly SpawnPoint[] = EMPTY_SPAWNS;
    try {
      points = world.getSpawnPoints('enemy');
    } catch {
      points = EMPTY_SPAWNS;
    }

    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < points.length; i++) {
      // Avoid using the same doorway twice in a row even when it scores best.
      const score = this.scoreSite(bb, points[i].position) + points[i].priority * 0.5 +
        (i === this.lastSiteIndex ? -3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best >= 0 && bestScore > 0) {
      this.lastSiteIndex = best;
      out.copy(points[best].position);
      return true;
    }

    return this.pickFallbackSite(bb, out);
  }

  /** Higher is better; anything at or below zero is unusable. */
  private scoreSite(bb: Blackboard, position: THREE.Vector3): number {
    const target = bb.target;
    if (!target.alive) return 1;

    const dx = position.x - target.feet.x;
    const dz = position.z - target.feet.z;
    const distance = Math.hypot(dx, dz);
    if (distance < DIRECTOR.minSpawnDistance) return -1;
    if (distance > MAX_SPAWN_DISTANCE) return -1;

    // Inside the player's forward cone is out, whatever else is true: watching a
    // man appear is the single most immersion-breaking thing a spawner can do.
    const player = bb.player;
    if (player) {
      player.getLookDirection(LOOK);
      const horizontal = Math.hypot(LOOK.x, LOOK.z);
      if (horizontal > 1e-4) {
        const dot = (dx * LOOK.x + dz * LOOK.z) / (distance * horizontal);
        if (dot > COS_SPAWN_CONE) return -1;
      }
    }

    EYE.set(position.x, position.y + BODY.eyeHeight, position.z);
    if (bb.lineOfSight(EYE, target.eye)) return -1;

    // Of what is left, closest wins: reinforcements that have to walk sixty metres
    // arrive after the fight is over.
    return 6 - distance / MAX_SPAWN_DISTANCE * 4;
  }

  /**
   * Secondary sites, taken from the cover set.
   *
   * Cover points are guaranteed to be standable and there are 1821 of them spread
   * across the whole map, so there is nearly always one that satisfies the same
   * distance, cone and occlusion rules the authored spawns are held to.
   */
  private pickFallbackSite(bb: Blackboard, out: THREE.Vector3): boolean {
    const count = bb.cover.count;
    if (count === 0) return false;
    const start = bb.rng.int(0, count - 1);
    // A bounded scan with a random start: uniform enough over many spawns, and
    // never more than 48 line-of-sight tests on the frame it runs.
    for (let n = 0; n < 48; n++) {
      const point = bb.cover.at((start + n * 37) % count);
      if (!point) continue;
      if (this.scoreSite(bb, point.position) <= 0) continue;
      out.copy(point.position);
      this.lastSiteIndex = -1;
      return true;
    }
    return false;
  }

  /** Yaw that has the spawned soldier looking towards the fight. */
  private facingPlayer(bb: Blackboard, position: THREE.Vector3): number {
    if (!bb.target.alive) return bb.rng.range(-Math.PI, Math.PI);
    return Math.atan2(-(bb.target.feet.x - position.x), -(bb.target.feet.z - position.z));
  }

  /**
   * Points an elevation-loving archetype at the nearest raised walkable surface.
   *
   * Rooftops and upper floors are exactly where a marksman belongs and exactly
   * where nothing else in the AI would ever send one, because every other
   * destination is derived from the target's position. Searched on a coarse
   * stride, and only ever once per spawn.
   */
  private sendUpstairs(bb: Blackboard, enemy: Enemy): void {
    const nav = bb.nav;
    if (!nav || nav.layerCount < 2) return;

    const cellRadius = Math.ceil(22 / nav.cellSize);
    const cx0 = Math.floor((enemy.feet.x - nav.originX) / nav.cellSize);
    const cz0 = Math.floor((enemy.feet.z - nav.originZ) / nav.cellSize);
    const stride = 3;
    let bestHeight = enemy.feet.y + 2.5;
    let bestX = 0;
    let bestZ = 0;
    let found = false;

    for (let dz = -cellRadius; dz <= cellRadius; dz += stride) {
      for (let dx = -cellRadius; dx <= cellRadius; dx += stride) {
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        if (!nav.inside(cx, cz)) continue;
        for (let layer = nav.layerCount - 1; layer >= 1; layer--) {
          if (!nav.walkableAtCell(cx, cz, layer)) continue;
          const height = nav.heightAtCell(cx, cz, layer);
          if (height <= bestHeight) continue;
          bestHeight = height;
          bestX = cellCentreX(nav, cx);
          bestZ = cellCentreZ(nav, cz);
          found = true;
        }
      }
    }
    if (!found) return;
    CANDIDATE.set(bestX, bestHeight, bestZ);
    enemy.moveTo(bb, CANDIDATE, 'walk', 0.5);
  }

  /**
   * Puts `position` on the floor, in place.
   *
   * Spawn points are authored at floor level, but a metre of drift creeps in
   * from rooftops and rubble, so the first choice is the surface directly under
   * the request. When that surface is nowhere near the height asked for, the
   * request itself is wrong rather than merely imprecise — the usual cause is a
   * caller that derived the height from a top-down ground sample, which cannot
   * tell a street from the roof of the building over it — and the nearest
   * walkable cell is a better answer than leaving a man standing in the air.
   */
  private resolveFooting(bb: Blackboard, position: THREE.Vector3): void {
    const ground = bb.surfaceAt(position.x, position.z, position.y);
    if (ground !== null && Math.abs(ground - position.y) < 1.5) {
      position.y = ground;
      return;
    }
    if (this.snap(bb, position.x, position.z, position.y, CANDIDATE)) {
      position.copy(CANDIDATE);
      return;
    }
    if (ground !== null) position.y = ground;
  }

  private snap(
    bb: Blackboard,
    x: number,
    z: number,
    y: number,
    out: THREE.Vector3,
  ): boolean {
    const nav = bb.nav;
    if (!nav) return false;
    const packed = nearestWalkable(nav, x, y, z, 3);
    if (packed < 0) return false;
    const layers = nav.layerCount;
    const layer = packed % layers;
    const cell = (packed - layer) / layers;
    const cx = cell % nav.width;
    const cz = (cell - cx) / nav.width;
    out.set(cellCentreX(nav, cx), nav.heightAtCell(cx, cz, layer), cellCentreZ(nav, cz));
    return true;
  }

  // =========================================================================
  // Corpses
  // =========================================================================

  /**
   * Returns finished corpses to the pool and enforces the corpse budget.
   *
   * `Enemy.updateCorpse` sets `recyclable` once a body has settled, lingered and
   * sunk. The budget exists on top of that because a long firefight in one street
   * would otherwise leave twenty ragdolls in it, and every one of them is a
   * skinned mesh being submitted.
   */
  private recycleCorpses(bb: Blackboard): void {
    let corpses = 0;
    let oldest: Enemy | null = null;
    let oldestAge = -1;

    for (let i = this.all.length - 1; i >= 0; i--) {
      const enemy = this.all[i];
      if (enemy.recyclable) {
        this.retire(bb, enemy, i);
        continue;
      }
      if (!enemy.dying) continue;
      corpses++;
      const age = enemy.deathAge(bb.now);
      if (age > oldestAge) {
        oldestAge = age;
        oldest = enemy;
      }
    }

    if (corpses > DIRECTOR.maxCorpses && oldest) {
      const index = this.all.indexOf(oldest);
      if (index >= 0) this.retire(bb, oldest, index);
    }
  }

  // =========================================================================
  // Engagement tokens
  // =========================================================================

  /**
   * Decides which agents are allowed to shoot to kill.
   *
   * Whoever is closest with eyes on gets a token, on the reasoning that the man
   * twelve metres away in front of you is the one the player is already dealing
   * with, and the ones at forty metres flanking are the ones who should be missing.
   * Reassignment is on a timer rather than per frame: a token that moves every
   * frame produces a fight where nobody ever finishes converging on the target and
   * the incoming fire has no shape to it.
   *
   * Suppressed agents are excluded, and an agent with a token that loses sight
   * keeps it until the next reassignment so a corner-peek does not hand the token
   * away and back twice a second.
   */
  private assignEngagement(dt: number, bb: Blackboard): void {
    this.engagementTimer -= dt;
    if (this.engagementTimer > 0) return;
    this.engagementTimer = FIGHT.engagementInterval;

    const ranked = this.ranked;
    ranked.length = 0;
    for (const enemy of this.all) {
      // Cleared unconditionally first: a corpse or a posed debug subject that kept
      // a token would hold one of the three slots for as long as it existed.
      enemy.focused = false;
      if (!enemy.isAlive || enemy.posed || enemy.pinned) continue;
      if (!enemy.perception.visible || !enemy.perception.engaged) continue;
      ranked.push(enemy);
    }

    ranked.sort(byThreatProximity);
    const limit = Math.min(FIGHT.maxEngaging, ranked.length);
    for (let i = 0; i < ranked.length; i++) ranked[i].focused = i < limit;
    ranked.length = 0;
  }

  private retire(bb: Blackboard, enemy: Enemy, index: number): void {
    enemy.despawn(bb);
    enemy.model.root.removeFromParent();
    this.squads.remove(enemy);
    enemy.squad = null;
    this.all.splice(index, 1);
    this.idle.push(enemy);
    this.stats.recycled++;
    this.stats.poolSize = this.idle.length;
  }

  // =========================================================================
  // Global stimuli
  // =========================================================================

  /** Everyone in range starts looking at `position`. */
  alertAll(bb: Blackboard, position: THREE.Vector3, radius: number, intensity: number): void {
    const radiusSq = radius * radius;
    for (const enemy of this.all) {
      if (!enemy.isAlive) continue;
      if (enemy.feet.distanceToSquared(position) > radiusSq) continue;
      const distance = Math.max(1, enemy.feet.distanceTo(position));
      const falloff = 1 - Math.min(1, distance / Math.max(1, radius));
      enemy.perception.hear(
        position,
        Math.min(1, intensity * (0.4 + 0.6 * falloff)),
        'explosion',
        bb.now,
        bb.difficulty.awarenessScale,
      );
      enemy.perception.noteThreatFrom(position, enemy.feet);
    }
  }

  /** Incoming fire near `position`. Called by combat for near misses and blasts. */
  suppress(position: THREE.Vector3, radius: number, duration: number): void {
    const radiusSq = radius * radius;
    for (const enemy of this.all) {
      if (!enemy.isAlive) continue;
      const distanceSq = enemy.feet.distanceToSquared(position);
      if (distanceSq > radiusSq) continue;
      const falloff = 1 - Math.min(1, Math.sqrt(distanceSq) / Math.max(0.5, radius));
      // Half a unit per near miss at the centre, and a unit and a half from a
      // grenade, against a decay of 0.55 a second: sustained fire pins, one
      // stray round does not.
      enemy.applySuppression(Math.max(0.08, duration * 0.5 * (0.35 + 0.65 * falloff)), position);
    }
  }

  /** A sound anyone might notice. `radius` is where it becomes inaudible. */
  broadcastSound(
    bb: Blackboard,
    position: THREE.Vector3,
    radius: number,
    kind: 'footstep' | 'gunshot' | 'explosion' | 'mantle' | 'impact',
    scale = 1,
  ): void {
    if (radius <= 0) return;
    const radiusSq = radius * radius;
    for (const enemy of this.all) {
      if (!enemy.isAlive) continue;
      const distanceSq = enemy.feet.distanceToSquared(position);
      if (distanceSq > radiusSq) continue;
      // Inverse falloff, squared so the near field dominates: a footstep at three
      // metres is a contact and at eighteen is a reason to turn round.
      const loudness = (1 - Math.sqrt(distanceSq) / radius) ** 1.6 * scale;
      // A wall between the two does not stop sound, but it does muddy where it
      // came from, so an occluded sound is worth much less.
      EYE.set(enemy.feet.x, enemy.feet.y + BODY.eyeHeight, enemy.feet.z);
      POSITION.set(position.x, position.y + 0.6, position.z);
      const clear = bb.lineOfSight(EYE, POSITION);
      enemy.perception.hear(
        position,
        loudness * (clear ? 1 : 0.45),
        kind,
        bb.now,
        bb.difficulty.awarenessScale,
      );
    }
  }

  /** Loudness radius for a weapon report. */
  static gunshotRadius(suppressed: boolean): number {
    return suppressed ? HEARING.gunshotSuppressed : HEARING.gunshot;
  }

  // =========================================================================
  // Queries
  // =========================================================================

  /** Allocation-free: reuses whatever vectors `out` already holds. */
  positions(out: THREE.Vector3[]): THREE.Vector3[] {
    let n = 0;
    for (const enemy of this.all) {
      if (!enemy.isAlive) continue;
      const slot = out[n];
      if (slot) slot.copy(enemy.feet);
      else out.push(enemy.feet.clone());
      n++;
    }
    out.length = n;
    return out;
  }

  /** Live enemy nearest `point`, or null. Used by the debug overlay and tests. */
  nearest(point: THREE.Vector3): Enemy | null {
    let best: Enemy | null = null;
    let bestDistance = Infinity;
    for (const enemy of this.all) {
      if (!enemy.isAlive) continue;
      const distance = enemy.feet.distanceToSquared(point);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best;
  }

  /** Triangles the live population is submitting at their current detail levels. */
  liveTriangles(): number {
    let total = 0;
    for (const enemy of this.all) if (enemy.model.root.visible) total += enemy.triangles;
    return total;
  }

  /** Agents in each level-of-detail band, for the performance report. */
  lodHistogram(out: [number, number, number]): [number, number, number] {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    for (const enemy of this.all) {
      if (!enemy.live) continue;
      const distance = enemy.lodDistance;
      if (distance < LOD.nearDistance) out[0]++;
      else if (distance < LOD.midDistance) out[1]++;
      else out[2]++;
    }
    return out;
  }

  // =========================================================================
  // Teardown
  // =========================================================================

  /** Despawns everyone. The pool and the shared geometry survive. */
  clear(bb: Blackboard): void {
    for (let i = this.all.length - 1; i >= 0; i--) this.retire(bb, this.all[i], i);
    this.squads.clear();
    bb.cover.clearClaims();
  }

  dispose(bb: Blackboard): void {
    this.clear(bb);
    for (const enemy of this.idle) {
      enemy.dispose(bb);
      this.factory.release(enemy.model);
    }
    this.idle.length = 0;
    this.factory.dispose();
    this.scene = null;
  }
}

const EMPTY_SPAWNS: readonly SpawnPoint[] = [];
