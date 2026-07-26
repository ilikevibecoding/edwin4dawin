import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import { QUALITY, TUNING } from '../core/Config';
import type { PhysicsSystem, Hitbox } from '../physics/Physics';
import type { LevelSystem, CoverPoint } from '../world/Level';
import type { PlayerSystem } from '../player/Player';
import type { BallisticsSystem } from '../weapons/Ballistics';
import { WEAPONS } from '../weapons/WeaponDefs';
import { buildSoldier, animateSoldier, collapseSoldier, type SoldierRig } from './Soldier';

type AIState = 'idle' | 'patrol' | 'alert' | 'engage' | 'seekCover' | 'inCover' | 'flank' | 'reload' | 'dead';

interface Enemy {
  id: number;
  rig: SoldierRig;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  targetYaw: number;
  aimPitch: number;
  health: number;
  state: AIState;
  stateTimer: number;
  /** 0..1 confidence the player is where we think they are. */
  awareness: number;
  lastKnownPlayer: THREE.Vector3;
  cover: CoverPoint | null;
  path: THREE.Vector3[];
  pathIndex: number;
  fireCooldown: number;
  burstRemaining: number;
  mag: number;
  reloadTimer: number;
  gaitPhase: number;
  crouch: number;
  aiming: number;
  recoil: number;
  flinch: number;
  deathTimer: number;
  deathDirection: number;
  variant: number;
  /** Reaction delay so enemies do not all fire on the same frame. */
  reactionTimer: number;
  accuracy: number;
  hitboxes: Hitbox[];
  active: boolean;
  /** Suppression applied by nearby player fire, degrades their accuracy. */
  suppressed: number;
}

/**
 * Enemy AI.
 *
 * The behaviour model is a small state machine layered on top of a shared
 * perception system. Two design choices matter most for how the game *feels*:
 *
 *  - Enemies have a reaction delay and imperfect first-shot accuracy that
 *    tightens over the course of an engagement. Instantly-accurate AI is
 *    trivially frustrating; AI that ramps gives the player time to react and
 *    still punishes standing still.
 *  - They actively give up cover to flank when the player holds an angle too
 *    long, which is what stops firefights from becoming static.
 */
export class AISystem implements System {
  readonly name = 'ai';
  readonly order = 30;

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;
  private level!: LevelSystem;
  private player!: PlayerSystem;
  private ballistics!: BallisticsSystem;

  private readonly enemies: Enemy[] = [];
  private nextId = 1;
  private readonly group = new THREE.Group();

  /** Global combat intensity, drives music and the AI director. */
  intensity = 0;
  aliveCount = 0;
  totalSpawned = 0;

  private spawnTimer = 0;
  private readonly maxAlive = 9;

  private readonly _v = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.physics = ctx.get<PhysicsSystem>('physics')!;
    this.level = ctx.get<LevelSystem>('level')!;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.ballistics = ctx.get<BallisticsSystem>('ballistics')!;

    this.group.name = 'enemies';
    ctx.scene.add(this.group);

    Signals.on('actor:damaged', (e) => this.onDamaged(e));
    Signals.on('explosion:spawn', (e) => this.onExplosion(e));

    const spots = this.level.spawns.filter((s) => s.team === 'enemy');
    for (let i = 0; i < Math.min(7, spots.length); i++) {
      this.spawnEnemy(spots[i].position, spots[i].yaw);
    }
  }

  private spawnEnemy(position: THREE.Vector3, yaw: number): Enemy | null {
    if (this.aliveCount >= this.maxAlive) return null;

    const variant = this.nextId % 3;
    const rig = buildSoldier(this.level.materials, variant);
    rig.root.position.copy(position);
    this.group.add(rig.root);

    const id = this.nextId++;
    const enemy: Enemy = {
      id,
      rig,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      yaw,
      targetYaw: yaw,
      aimPitch: 0,
      health: 100,
      state: 'patrol',
      stateTimer: 0,
      awareness: 0,
      lastKnownPlayer: new THREE.Vector3(),
      cover: null,
      path: [],
      pathIndex: 0,
      fireCooldown: 0,
      burstRemaining: 0,
      mag: 30,
      reloadTimer: 0,
      gaitPhase: Math.random() * Math.PI * 2,
      crouch: 0,
      aiming: 0,
      recoil: 1,
      flinch: 0,
      deathTimer: 0,
      deathDirection: 1,
      variant,
      reactionTimer: 0,
      accuracy: 0.3,
      hitboxes: [],
      active: true,
      suppressed: 0,
    };

    enemy.hitboxes = [
      { actorId: id, region: 'head', radius: 0.13, height: 0.16, object: rig.hitHead, damageScale: 1, active: true },
      { actorId: id, region: 'chest', radius: 0.22, height: 0.3, object: rig.hitChest, damageScale: 1, active: true },
      { actorId: id, region: 'stomach', radius: 0.2, height: 0.26, object: rig.hitStomach, damageScale: 1, active: true },
      { actorId: id, region: 'leg', radius: 0.19, height: 0.85, object: rig.pelvis, damageScale: 1, active: true },
    ];
    this.physics.registerHitboxes(id, enemy.hitboxes);

    this.enemies.push(enemy);
    this.aliveCount++;
    this.totalSpawned++;
    return enemy;
  }

  private onDamaged(e: {
    actorId: number; amount: number; region?: string; point?: THREE.Vector3; direction?: THREE.Vector3;
  }): void {
    const enemy = this.enemies.find((x) => x.id === e.actorId);
    if (!enemy || enemy.state === 'dead') return;

    enemy.health -= e.amount;
    enemy.flinch = Math.min(1, enemy.flinch + e.amount / 60);
    enemy.awareness = 1;
    enemy.lastKnownPlayer.copy(this.player.position);
    enemy.suppressed = Math.min(1, enemy.suppressed + 0.5);

    const headshot = e.region === 'head';
    const lethal = enemy.health <= 0;

    Signals.emit('ui:hitmarker', { lethal, headshot, armor: e.region === 'chest' });

    if (lethal) {
      this.killEnemy(enemy, headshot, e.direction);
    } else if (e.point && e.direction) {
      // Blood spray out the far side.
      Signals.emit('bullet:impact', {
        point: { x: e.point.x, y: e.point.y, z: e.point.z },
        normal: { x: -e.direction.x, y: -e.direction.y, z: -e.direction.z },
        surface: 'flesh',
        direction: { x: e.direction.x, y: e.direction.y, z: e.direction.z },
        distance: 0,
        actorId: e.actorId,
      });
    }
  }

  private killEnemy(enemy: Enemy, headshot: boolean, direction?: THREE.Vector3): void {
    enemy.state = 'dead';
    enemy.deathTimer = 0;
    enemy.deathDirection = direction ? Math.sign(direction.dot(this._v.set(Math.sin(enemy.yaw), 0, Math.cos(enemy.yaw)))) || 1 : 1;
    enemy.health = 0;
    this.physics.setActorActive(enemy.id, false);
    this.level.releaseCover(enemy.id);
    this.aliveCount--;

    Signals.emit('actor:killed', {
      actorId: enemy.id,
      cause: 'bullet',
      headshot,
      attackerId: 0,
    });
    Signals.emit('audio:oneshot', {
      id: headshot ? 'kill_headshot' : 'kill_body',
      position: enemy.position.clone(),
      volume: 0.7,
    });
  }

  private onExplosion(e: { position: THREE.Vector3; radius: number; damage: number }): void {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;
      const d = enemy.position.distanceTo(e.position);
      if (d > e.radius) continue;
      // Inverse-square-ish falloff with a line-of-sight check, so cover works
      // against explosives too.
      const eyes = this._v.copy(enemy.position).setY(enemy.position.y + 1.2);
      const exposed = this.physics.lineOfSight(e.position, eyes) ? 1 : 0.32;
      const falloff = Math.pow(1 - d / e.radius, 1.7);
      const dmg = e.damage * falloff * exposed;
      if (dmg < 1) continue;
      const dir = this._v2.copy(enemy.position).sub(e.position).normalize();
      this.onDamaged({ actorId: enemy.id, amount: dmg, direction: dir });
    }

    // Player takes explosion damage too.
    const pd = this.player.position.distanceTo(e.position);
    if (pd < e.radius && this.player.alive) {
      const eyes = this._v.copy(this.player.position).setY(this.player.position.y + 1.4);
      const exposed = this.physics.lineOfSight(e.position, eyes) ? 1 : 0.3;
      const falloff = Math.pow(1 - pd / e.radius, 1.7);
      const dmg = e.damage * falloff * exposed;
      if (dmg > 1) {
        Signals.emit('player:damaged', {
          amount: dmg,
          direction: this._v2.copy(this.player.position).sub(e.position).normalize(),
          cause: 'explosion',
        });
        const pipeline = this.ctx.engine.pipeline;
        pipeline.concussion = Math.min(1, pipeline.concussion + falloff * exposed);
      }
    }
  }

  // ------------------------------------------------------------ simulate ---

  fixedUpdate(dt: number): void {
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      this.stepEnemy(e, dt);
    }
  }

  private stepEnemy(e: Enemy, dt: number): void {
    const playerPos = this.player.position;
    const eyePos = this._v.copy(e.position).setY(e.position.y + 1.55);
    const playerEye = this._v2.copy(playerPos).setY(playerPos.y + 1.4);

    // ---- perception ----
    const toPlayer = this._v3.copy(playerEye).sub(eyePos);
    const dist = toPlayer.length();
    toPlayer.divideScalar(Math.max(dist, 1e-4));

    const facing = this._v.set(Math.sin(e.yaw), 0, Math.cos(e.yaw)).normalize();
    const dot = facing.dot(this._v.set(toPlayer.x, 0, toPlayer.z).normalize());
    // 120-degree cone, but hearing and being shot at bypass it.
    const inFov = dot > -0.1;
    const canSee = this.player.alive && dist < 95 && inFov &&
      this.physics.lineOfSight(
        this._v.copy(e.position).setY(e.position.y + 1.55),
        playerEye,
      );

    if (canSee) {
      // Detection ramps faster at close range and when the player is moving.
      const speedFactor = 0.5 + this.player.speedFraction;
      const rangeFactor = THREE.MathUtils.clamp(1 - dist / 95, 0.1, 1);
      e.awareness = Math.min(1, e.awareness + dt * (0.9 + rangeFactor * 2.2) * speedFactor);
      e.lastKnownPlayer.copy(playerPos);
    } else {
      e.awareness = Math.max(0, e.awareness - dt * 0.22);
    }

    e.suppressed = Math.max(0, e.suppressed - dt * 0.55);
    e.flinch = Math.max(0, e.flinch - dt * 2.4);
    e.recoil += dt;
    e.stateTimer += dt;

    // ---- state machine ----
    switch (e.state) {
      case 'patrol':
      case 'idle':
        e.aiming = THREE.MathUtils.damp(e.aiming, 0, 4, dt);
        if (e.awareness > 0.45) this.transition(e, 'alert');
        else this.patrolBehaviour(e, dt);
        break;

      case 'alert':
        e.aiming = THREE.MathUtils.damp(e.aiming, 0.6, 6, dt);
        this.faceTarget(e, e.lastKnownPlayer, dt, 6);
        if (e.awareness >= 0.95 && canSee) {
          e.reactionTimer = 0.18 + Math.random() * 0.34;
          this.transition(e, 'engage');
          Signals.emit('audio:oneshot', {
            id: 'enemy_spot', position: e.position.clone(), volume: 0.65,
          });
        } else if (e.awareness < 0.2) {
          this.transition(e, 'patrol');
        } else {
          this.moveToward(e, e.lastKnownPlayer, dt, 2.2);
        }
        break;

      case 'engage':
        e.aiming = THREE.MathUtils.damp(e.aiming, 1, 9, dt);
        this.faceTarget(e, playerEye, dt, 9);
        this.engageBehaviour(e, dt, canSee, dist);
        break;

      case 'seekCover':
        e.aiming = THREE.MathUtils.damp(e.aiming, 0.35, 5, dt);
        this.seekCoverBehaviour(e, dt);
        break;

      case 'inCover':
        this.inCoverBehaviour(e, dt, canSee, dist);
        break;

      case 'flank':
        e.aiming = THREE.MathUtils.damp(e.aiming, 0.5, 5, dt);
        this.flankBehaviour(e, dt);
        break;

      case 'reload':
        e.aiming = THREE.MathUtils.damp(e.aiming, 0.4, 5, dt);
        e.reloadTimer -= dt;
        e.crouch = THREE.MathUtils.damp(e.crouch, 0.7, 5, dt);
        if (e.reloadTimer <= 0) {
          e.mag = 30;
          this.transition(e, e.cover ? 'inCover' : 'engage');
        }
        break;
    }

    // ---- physics ----
    e.velocity.y -= TUNING.gravity * dt;
    e.position.addScaledVector(e.velocity, dt);
    const out = { grounded: false, groundNormal: new THREE.Vector3(0, 1, 0), surface: 'sand' as never, hitWall: false };
    this.physics.resolveCapsule(e.position, 0.34, 1.75 - e.crouch * 0.5, out);
    if (out.grounded && e.velocity.y < 0) e.velocity.y = 0;
    // Horizontal damping; steering writes velocity directly each frame.
    e.velocity.x *= Math.max(0, 1 - 9 * dt);
    e.velocity.z *= Math.max(0, 1 - 9 * dt);

    // ---- gait ----
    const speed = Math.hypot(e.velocity.x, e.velocity.z);
    e.gaitPhase += dt * (2.6 + speed * 1.35);
    e.yaw = angleDamp(e.yaw, e.targetYaw, 7, dt);
  }

  private transition(e: Enemy, next: AIState): void {
    if (e.state === next) return;
    e.state = next;
    e.stateTimer = 0;
  }

  private patrolBehaviour(e: Enemy, dt: number): void {
    e.crouch = THREE.MathUtils.damp(e.crouch, 0, 4, dt);
    if (e.path.length === 0 || e.pathIndex >= e.path.length) {
      // Wander to a nearby nav node.
      const nodes = this.level.navNodes;
      if (nodes.length === 0) return;
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      if (target.distanceTo(e.position) > 40) return;
      e.path = [target.clone()];
      e.pathIndex = 0;
    }
    const target = e.path[e.pathIndex];
    if (this.moveToward(e, target, dt, 1.6)) e.pathIndex++;
  }

  private engageBehaviour(e: Enemy, dt: number, canSee: boolean, dist: number): void {
    e.crouch = THREE.MathUtils.damp(e.crouch, dist < 20 ? 0.25 : 0, 3, dt);

    if (e.reactionTimer > 0) {
      e.reactionTimer -= dt;
      return;
    }

    if (e.mag <= 0) {
      e.reloadTimer = 2.4;
      this.transition(e, 'reload');
      return;
    }

    if (!canSee) {
      if (e.stateTimer > 1.4) {
        // Lost sight: either push to the last known position or flank.
        this.transition(e, Math.random() < 0.4 ? 'flank' : 'seekCover');
      }
      return;
    }

    // Take cover when hurt or when the fight has gone on a while.
    if ((e.health < 55 || e.stateTimer > 4.5) && !e.cover && Math.random() < dt * 1.4) {
      this.transition(e, 'seekCover');
      return;
    }

    // Strafe while shooting so they are not static targets.
    const strafeDir = Math.sin(e.stateTimer * 1.1 + e.id) > 0 ? 1 : -1;
    if (dist > 8) {
      const right = this._v.set(Math.cos(e.yaw), 0, -Math.sin(e.yaw));
      e.velocity.addScaledVector(right, strafeDir * 8 * dt);
    }
    // Close the distance if far away.
    if (dist > 34) {
      const fwd = this._v.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      e.velocity.addScaledVector(fwd, 11 * dt);
    }

    this.tryFire(e, dt, dist);
  }

  private seekCoverBehaviour(e: Enemy, dt: number): void {
    e.crouch = THREE.MathUtils.damp(e.crouch, 0.1, 4, dt);
    if (!e.cover) {
      e.cover = this.level.findCover(e.position, this.player.position, e.id, 26);
      if (!e.cover) {
        this.transition(e, 'engage');
        return;
      }
    }
    if (this.moveToward(e, e.cover.position, dt, 5.4)) {
      this.transition(e, 'inCover');
    } else if (e.stateTimer > 7) {
      this.level.releaseCover(e.id);
      e.cover = null;
      this.transition(e, 'engage');
    }
  }

  private inCoverBehaviour(e: Enemy, dt: number, canSee: boolean, dist: number): void {
    const cover = e.cover;
    if (!cover) {
      this.transition(e, 'engage');
      return;
    }

    // Duck behind cover, pop up to shoot on a rhythm, and vary the timing so
    // the player cannot metronome the peek.
    const cycle = 2.4 + (e.id % 5) * 0.42;
    const t = (e.stateTimer % cycle) / cycle;
    const peeking = t > 0.42 && t < 0.78;

    e.crouch = THREE.MathUtils.damp(e.crouch, peeking ? 0.12 : 0.85, 7, dt);
    e.aiming = THREE.MathUtils.damp(e.aiming, peeking ? 1 : 0.3, 7, dt);

    this.faceTarget(e, this._v.copy(this.player.position).setY(this.player.position.y + 1.4), dt, 7);
    this.moveToward(e, cover.position, dt, 3.2);

    if (peeking && canSee) {
      if (e.mag <= 0) {
        e.reloadTimer = 2.4;
        this.transition(e, 'reload');
        return;
      }
      this.tryFire(e, dt, dist);
    }

    // Flank if the standoff has lasted too long.
    if (e.stateTimer > 8 + (e.id % 4) * 2) {
      this.level.releaseCover(e.id);
      e.cover = null;
      this.transition(e, 'flank');
    }
  }

  private flankBehaviour(e: Enemy, dt: number): void {
    e.crouch = THREE.MathUtils.damp(e.crouch, 0, 4, dt);
    if (e.path.length === 0 || e.pathIndex >= e.path.length) {
      // Pick a nav node that approaches the player from a different bearing.
      const nodes = this.level.navNodes;
      const toPlayer = this._v.copy(this.player.position).sub(e.position).normalize();
      let best: THREE.Vector3 | null = null;
      let bestScore = -Infinity;
      for (let i = 0; i < 60; i++) {
        const n = nodes[Math.floor(Math.random() * nodes.length)];
        if (!n) continue;
        const toNode = this._v2.copy(n).sub(e.position);
        const d = toNode.length();
        if (d < 6 || d > 34) continue;
        toNode.divideScalar(d);
        // Prefer lateral movement that still reduces distance to the player.
        const lateral = 1 - Math.abs(toNode.dot(toPlayer));
        const closing = 1 - n.distanceTo(this.player.position) / 60;
        const score = lateral * 2.2 + closing * 1.4 - d * 0.02;
        if (score > bestScore) { bestScore = score; best = n; }
      }
      if (!best) {
        this.transition(e, 'engage');
        return;
      }
      e.path = [best.clone()];
      e.pathIndex = 0;
    }

    const target = e.path[e.pathIndex];
    this.faceTarget(e, target, dt, 5);
    if (this.moveToward(e, target, dt, 6.2)) {
      e.pathIndex++;
      if (e.pathIndex >= e.path.length) {
        e.path = [];
        this.transition(e, 'engage');
      }
    }
    if (e.stateTimer > 9) {
      e.path = [];
      this.transition(e, 'engage');
    }
  }

  private tryFire(e: Enemy, dt: number, dist: number): void {
    e.fireCooldown -= dt;
    if (e.fireCooldown > 0) return;

    if (e.burstRemaining <= 0) {
      e.burstRemaining = 3 + Math.floor(Math.random() * 4);
      // Pause between bursts scales with distance — distant enemies are less
      // oppressive, which keeps long sightlines playable.
      e.fireCooldown = 0.35 + Math.random() * 0.6 + dist * 0.012;
      return;
    }

    e.burstRemaining--;
    e.mag--;
    e.fireCooldown = 0.095;
    e.recoil = 0;

    // Accuracy climbs during an engagement and collapses under suppression.
    e.accuracy = Math.min(0.88, e.accuracy + 0.045);
    const effective = e.accuracy * (1 - e.suppressed * 0.55) * (1 - e.flinch * 0.5);
    // Cone in milliradians: wide when they first engage, tight later.
    const coneMrad = THREE.MathUtils.lerp(48, 7, effective) * (1 + dist * 0.01);
    const halfAngle = (coneMrad / 1000) * 0.5;

    const muzzleWorld = new THREE.Vector3();
    e.rig.muzzle.getWorldPosition(muzzleWorld);

    const target = this._v.copy(this.player.position).setY(this.player.position.y + 1.25);
    // Lead the player slightly, as a human shooter would.
    target.addScaledVector(this.player.velocity, dist / 700);
    const dir = target.sub(muzzleWorld).normalize();

    // Cone spread.
    const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
    const r = Math.sqrt(Math.random()) * Math.tan(halfAngle);
    const theta = Math.random() * Math.PI * 2;
    dir.addScaledVector(right, Math.cos(theta) * r).addScaledVector(realUp, Math.sin(theta) * r).normalize();

    this.ballistics.fireProjectile({
      origin: muzzleWorld,
      direction: dir,
      def: WEAPONS.m4a1,
      ownerId: e.id,
      isPlayer: false,
    });

    Signals.emit('weapon:fire', {
      weaponId: 'ai_rifle',
      muzzleWorld: muzzleWorld.clone(),
      direction: dir.clone(),
      silenced: false,
      ammoLeft: e.mag,
    });
  }

  // ------------------------------------------------------------ steering ---

  /** Steers toward a target; returns true when arrived. */
  private moveToward(e: Enemy, target: THREE.Vector3, dt: number, speed: number): boolean {
    const to = this._v.copy(target).sub(e.position);
    to.y = 0;
    const dist = to.length();
    if (dist < 0.7) return true;
    to.divideScalar(dist);

    // Obstacle avoidance: probe left and right and steer away from blockage.
    const probeLen = 1.9;
    const origin = this._v2.copy(e.position).setY(e.position.y + 0.9);
    const leftDir = this._v3.copy(to).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.55);
    const rightDir = new THREE.Vector3().copy(to).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.55);
    const centre = this.physics.trace(origin, to, probeLen);
    if (centre.hit) {
      const l = this.physics.trace(origin, leftDir, probeLen);
      const r = this.physics.trace(origin, rightDir, probeLen);
      const lFree = l.hit ? l.distance : probeLen;
      const rFree = r.hit ? r.distance : probeLen;
      to.copy(lFree > rFree ? leftDir : rightDir);
    }

    // Separation from other enemies so squads do not stack.
    for (const other of this.enemies) {
      if (other === e || other.state === 'dead') continue;
      const d = other.position.distanceTo(e.position);
      if (d < 1.5 && d > 1e-3) {
        to.addScaledVector(
          this._v3.copy(e.position).sub(other.position).setY(0).normalize(),
          (1.5 - d) * 1.4,
        );
      }
    }
    to.normalize();

    e.velocity.addScaledVector(to, speed * 12 * dt);
    const horizontal = Math.hypot(e.velocity.x, e.velocity.z);
    if (horizontal > speed) {
      e.velocity.x *= speed / horizontal;
      e.velocity.z *= speed / horizontal;
    }

    if (e.state !== 'engage' && e.state !== 'inCover') {
      e.targetYaw = Math.atan2(to.x, to.z);
    }
    return false;
  }

  private faceTarget(e: Enemy, target: THREE.Vector3, dt: number, rate: number): void {
    const to = this._v.copy(target).sub(e.position);
    e.targetYaw = Math.atan2(to.x, to.z);
    const horizontal = Math.hypot(to.x, to.z);
    const desiredPitch = Math.atan2(to.y - 1.5, horizontal);
    e.aimPitch = THREE.MathUtils.damp(e.aimPitch, THREE.MathUtils.clamp(desiredPitch, -0.7, 0.7), rate, dt);
  }

  // -------------------------------------------------------------- update ---

  update(dt: number, ctx: EngineContext): void {
    let engaged = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.state === 'dead') {
        e.deathTimer += dt;
        collapseSoldier(e.rig, Math.min(1, e.deathTimer / 0.85), e.deathDirection);
        e.rig.root.position.copy(e.position);
        e.rig.root.rotation.y = e.yaw;
        // Bodies persist for a while so a firefight leaves visible evidence.
        if (e.deathTimer > 22) {
          this.despawn(e);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.state === 'engage' || e.state === 'inCover') engaged++;

      e.rig.root.position.copy(e.position);
      e.rig.root.rotation.y = e.yaw;

      const speed = Math.hypot(e.velocity.x, e.velocity.z);
      const forward = this._v.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      const right = this._v2.set(Math.cos(e.yaw), 0, -Math.sin(e.yaw));
      const strafe = this._v3.set(e.velocity.x, 0, e.velocity.z).dot(right) / Math.max(speed, 1e-3);
      void forward;

      animateSoldier(e.rig, {
        speed,
        phase: e.gaitPhase,
        strafe: THREE.MathUtils.clamp(strafe, -1, 1),
        aimYaw: 0,
        aimPitch: e.aimPitch,
        crouch: e.crouch,
        aiming: e.aiming,
        recoil: e.recoil,
        flinch: e.flinch,
        elapsed: ctx.time.elapsed,
      });
    }

    this.intensity = THREE.MathUtils.damp(this.intensity, THREE.MathUtils.clamp(engaged / 4, 0, 1), 1.4, dt);

    // ---- reinforcement director ----
    // Keep pressure roughly constant: spawn out of the player's view when the
    // squad thins out, so the fight never dies but never overwhelms either.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.aliveCount < 6) {
      this.spawnTimer = 4 + Math.random() * 5;
      const spots = this.level.spawns.filter((s) => s.team === 'enemy');
      const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
      const candidates = spots.filter((s) => {
        const to = this._v.copy(s.position).sub(this.player.position);
        const d = to.length();
        if (d < 18 || d > 70) return false;
        // Behind the player, or out of line of sight.
        return to.normalize().dot(camDir) < 0.35 ||
          !this.physics.lineOfSight(
            this._v2.copy(this.player.position).setY(this.player.position.y + 1.4),
            this._v3.copy(s.position).setY(s.position.y + 1.4),
          );
      });
      if (candidates.length > 0) {
        const spot = candidates[Math.floor(Math.random() * candidates.length)];
        this.spawnEnemy(spot.position, spot.yaw);
      }
    }

    void QUALITY;
  }

  private despawn(e: Enemy): void {
    this.physics.unregisterHitboxes(e.id);
    this.group.remove(e.rig.root);
    e.rig.dispose();
  }

  /** Kills everything inside a radius. Used by the airstrike. */
  applyAreaDamage(position: THREE.Vector3, radius: number, damage: number): void {
    this.onExplosion({ position, radius, damage });
  }

  get enemyPositions(): THREE.Vector3[] {
    return this.enemies.filter((e) => e.state !== 'dead').map((e) => e.position);
  }

  dispose(): void {
    for (const e of this.enemies) this.despawn(e);
    this.enemies.length = 0;
  }
}

function angleDamp(current: number, target: number, lambda: number, dt: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
}
