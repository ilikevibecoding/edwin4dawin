import * as THREE from 'three';
import type { ExplosionEvent, TracerEvent } from '../core/Events';
import { Layers, type GameContext } from '../core/GameContext';
import type { EnemyState, IWeapons } from '../core/Interfaces';
import { type Budget, type Deps, headingToDir, UP } from './Common';
import type { DustHaze } from './Ground';
import { HelicopterAssets, type HelicopterInstance } from './models/Helicopter';

/**
 * Everything on the ladder that is not an airstrike.
 *
 * These are deliberately cheaper than the strike — they have to exist, they
 * have to work, and they must not compete with it for attention — but each one
 * does the thing its name promises rather than printing a banner:
 *
 *  - **UAV** is pure information. It has no presence in the world at all,
 *    because the aircraft is at four thousand metres; what it produces is an
 *    event stream the HUD turns into a radar.
 *  - **Care package** is a real crate on a real parachute that lands where the
 *    player marked, sits there smoking, and rearms whoever walks into it.
 *  - **Mortar barrage** is twelve rounds walked across the box over ten
 *    seconds, each announced by its own whistle a second and a half before it
 *    lands. Nothing is modelled: a mortar round in flight is invisible and the
 *    whole weapon is the sound and the arrival.
 *  - **Attack helicopter** is a modelled gunship that orbits, acquires and
 *    engages with a chin gun, throwing real tracers and taking real kills.
 *  - **AC-130** hands the player the gun. The camera goes to the orbit, the
 *    reticle goes on the mouse, and forty seconds of 105 mm is theirs.
 */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

const _explosion: ExplosionEvent = {
  position: new THREE.Vector3(),
  radius: 10,
  damage: 130,
  scale: 1,
  source: 'grenade',
  normal: new THREE.Vector3(0, 1, 0),
};
const _tracer: TracerEvent = {
  origin: new THREE.Vector3(),
  end: new THREE.Vector3(),
  speed: 900,
  caliber: 20,
  fromPlayer: true,
};
const _audio = { id: '', position: new THREE.Vector3(), volume: 1, rate: 1 };
const _shake = {
  amplitude: 0,
  duration: 0,
  frequency: 18,
  position: new THREE.Vector3(),
  radius: 90,
};
const _package = {
  position: new THREE.Vector3(),
  state: 'inbound' as 'inbound' | 'landed' | 'collected',
};
const _aircraft = {
  id: 'heli',
  kind: 'helicopter' as 'jet' | 'helicopter' | 'gunship',
  position: new THREE.Vector3(),
  active: true,
};

function emitSound(
  ctx: GameContext,
  id: string,
  at: THREE.Vector3 | undefined,
  volume: number,
  rate = 1,
): void {
  _audio.id = id;
  _audio.volume = volume;
  _audio.rate = rate;
  _audio.position.copy(at ?? ctx.camera.position);
  ctx.events.emit('audio:play', _audio);
}

/* ------------------------------ care package ------------------------------ */

/**
 * The crate.
 *
 * Plywood over a steel frame with a canopy above it, which is four boxes and a
 * lathed dome — worth building properly only because it sits on the ground for
 * the rest of the round and the player will walk right up to it.
 */
class Crate {
  readonly root = new THREE.Group();
  readonly chute = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(parent: THREE.Object3D, shadows: boolean) {
    const body = new THREE.BoxGeometry(1.15, 0.9, 1.15);
    const frame = new THREE.BoxGeometry(1.22, 0.1, 1.22);
    const strut = new THREE.BoxGeometry(0.09, 0.94, 0.09);
    const canopy = new THREE.SphereGeometry(2.1, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const cord = new THREE.CylinderGeometry(0.012, 0.012, 2.4, 4);
    this.geometries.push(body, frame, strut, canopy, cord);

    const wood = new THREE.MeshStandardMaterial({ color: 0x5c4a30, roughness: 0.85, metalness: 0 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x30352f, roughness: 0.6, metalness: 0.6 });
    const silk = new THREE.MeshStandardMaterial({
      color: 0x8e9a72,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.materials.push(wood, steel, silk);

    const crate = new THREE.Mesh(body, wood);
    crate.castShadow = shadows;
    crate.receiveShadow = shadows;
    this.root.add(crate);
    for (const y of [-0.46, 0.46]) {
      const rail = new THREE.Mesh(frame, steel);
      rail.position.y = y;
      this.root.add(rail);
    }
    for (const [x, z] of [[-0.57, -0.57], [0.57, -0.57], [-0.57, 0.57], [0.57, 0.57]]) {
      const post = new THREE.Mesh(strut, steel);
      post.position.set(x, 0, z);
      this.root.add(post);
    }

    const dome = new THREE.Mesh(canopy, silk);
    dome.position.y = 3.6;
    dome.castShadow = shadows;
    this.chute.add(dome);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const line = new THREE.Mesh(cord, steel);
      line.position.set(Math.cos(a) * 0.85, 2.4, Math.sin(a) * 0.85);
      line.rotation.z = Math.cos(a) * -0.32;
      line.rotation.x = Math.sin(a) * 0.32;
      this.chute.add(line);
    }
    this.root.add(this.chute);
    this.root.visible = false;
    parent.add(this.root);
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}

/* ------------------------------- helicopter ------------------------------- */

interface Burst {
  /** Seconds left in the burst. */
  left: number;
  cooldown: number;
  targetId: number;
}

/* --------------------------------- system --------------------------------- */

export class SupportStreaks {
  private readonly group = new THREE.Group();
  private readonly crate: Crate;
  private readonly heliAssets: HelicopterAssets;
  private readonly heli: HelicopterInstance;

  /* --- UAV --- */
  uavLeft = 0;

  /* --- care package --- */
  private packageLeft = 0;
  private packageY = 0;
  private packageGround = 0;
  private packageLanded = false;
  private packageSmokeAt = 0;
  private readonly packageAt = new THREE.Vector3();

  /* --- mortar --- */
  private mortarLeft = 0;
  private mortarNext = 0;
  private mortarFired = 0;
  private mortarTotal = 0;
  private readonly mortarAt = new THREE.Vector3();
  private mortarHeading = 0;
  private readonly pending: Array<{ at: number; x: number; y: number; z: number }> = [];

  /* --- helicopter --- */
  private heliLeft = 0;
  private heliAngle = 0;
  private heliRotor = 0;
  private readonly heliCentre = new THREE.Vector3();
  private heliRadius = 62;
  private heliHeight = 38;
  private readonly burst: Burst = { left: 0, cooldown: 1.4, targetId: -1 };
  private heliDustAt = 0;
  private readonly heliAim = new THREE.Vector3();

  /* --- gunship --- */
  gunshipLeft = 0;
  private gunshipAngle = 0;
  private gunshipCool = 0;
  private readonly gunshipAim = new THREE.Vector3();
  private readonly gunshipCentre = new THREE.Vector3();
  private readonly gunshipRounds: Array<{ at: number; x: number; y: number; z: number; big: boolean }> =
    [];

  constructor(
    private readonly ctx: GameContext,
    private readonly deps: Deps,
    private readonly budget: Budget,
    private readonly haze: DustHaze,
    shadows: boolean,
  ) {
    this.group.name = 'killstreak.support';
    this.group.matrixAutoUpdate = false;
    ctx.scene.add(this.group);
    this.crate = new Crate(this.group, shadows);
    this.heliAssets = new HelicopterAssets(deps.materials, shadows);
    this.heli = this.heliAssets.instantiate('killstreak.helicopter');
    this.heli.root.visible = false;
    this.group.add(this.heli.root);
  }

  get anyActive(): boolean {
    return (
      this.uavLeft > 0 ||
      this.packageLeft > 0 ||
      this.mortarLeft > 0 ||
      this.heliLeft > 0 ||
      this.gunshipLeft > 0
    );
  }

  /* --------------------------------- UAV --------------------------------- */

  startUav(duration: number): void {
    this.uavLeft = duration;
    this.ctx.events.emit('killstreak:uav', { active: true, duration, sweepPeriod: 2.2 });
    emitSound(this.ctx, 'uav_online', undefined, 0.8);
  }

  private stepUav(dt: number): void {
    if (this.uavLeft <= 0) return;
    this.uavLeft -= dt;
    if (this.uavLeft <= 0) {
      this.uavLeft = 0;
      this.ctx.events.emit('killstreak:uav', { active: false, duration: 0, sweepPeriod: 2.2 });
    }
  }

  /* ----------------------------- care package ----------------------------- */

  dropPackage(target: THREE.Vector3): void {
    this.packageAt.copy(target);
    this.packageGround = this.deps.groundAt(target.x, target.z, target.y + 40);
    this.packageY = this.packageGround + 120;
    this.packageLeft = 240;
    this.packageLanded = false;
    this.packageSmokeAt = 0;
    this.crate.root.visible = true;
    this.crate.chute.visible = true;
    _package.position.copy(target);
    _package.state = 'inbound';
    this.ctx.events.emit('killstreak:package', _package);
    emitSound(this.ctx, 'package_inbound', target, 0.7);
  }

  private stepPackage(dt: number): void {
    if (this.packageLeft <= 0) return;
    this.packageLeft -= dt;

    if (!this.packageLanded) {
      // Terminal velocity under a canopy is about six metres a second, and the
      // crate swings a little under it the whole way down.
      this.packageY -= 6.4 * dt;
      const swing = Math.sin(this.packageY * 0.09) * 0.9;
      this.crate.root.position.set(
        this.packageAt.x + swing,
        this.packageY,
        this.packageAt.z + Math.cos(this.packageY * 0.07) * 0.7,
      );
      this.crate.root.rotation.z = swing * 0.06;
      if (this.packageY <= this.packageGround + 0.5) {
        this.packageY = this.packageGround + 0.5;
        this.packageLanded = true;
        this.crate.chute.visible = false;
        this.crate.root.position.set(this.packageAt.x, this.packageY, this.packageAt.z);
        this.crate.root.rotation.set(0, 0.4, 0);
        _package.position.copy(this.crate.root.position);
        _package.state = 'landed';
        this.ctx.events.emit('killstreak:package', _package);
        emitSound(this.ctx, 'package_land', this.crate.root.position, 0.9);
        this.deps.fx?.spawnSmoke(this.crate.root.position, 1.6, 30);
      }
      return;
    }

    // A marker the player can find from the other end of the street.
    this.packageSmokeAt -= dt;
    if (this.packageSmokeAt <= 0) {
      this.packageSmokeAt = 6;
      _v.copy(this.crate.root.position).addScaledVector(UP, 0.7);
      this.deps.fx?.spawnSmoke(_v, 1.4, 12);
    }

    const player = this.deps.player;
    if (player && player.position.distanceTo(this.crate.root.position) < 2.2) {
      this.collectPackage();
    }
    if (this.packageLeft <= 0) this.crate.root.visible = false;
  }

  private collectPackage(): void {
    this.packageLeft = 0;
    this.crate.root.visible = false;
    _package.position.copy(this.crate.root.position);
    _package.state = 'collected';
    this.ctx.events.emit('killstreak:package', _package);
    this.ctx.tryGet<IWeapons>('weapons')?.addAmmo?.(180);
    this.deps.player?.heal?.(45);
    this.ctx.events.emit('ui:notify', {
      title: 'RESUPPLIED',
      subtitle: 'Ammunition and armour',
      duration: 2.4,
      tone: 'positive',
    });
    emitSound(this.ctx, 'package_collect', this.crate.root.position, 0.8);
  }

  /* ------------------------------- mortars -------------------------------- */

  /**
   * Twelve rounds over ten seconds, walked across the box along the heading.
   *
   * Each is scheduled twice: once for the whistle and once for the arrival, a
   * second and a half apart, because a mortar you hear at the same instant it
   * lands is a firework and one you hear coming is a threat.
   */
  startMortars(target: THREE.Vector3, heading: number): void {
    this.mortarAt.copy(target);
    this.mortarHeading = heading;
    this.mortarTotal = 12;
    this.mortarFired = 0;
    this.mortarNext = 0.4;
    this.mortarLeft = 16;
    this.pending.length = 0;
    emitSound(this.ctx, 'mortar_call', undefined, 0.7);
  }

  private stepMortars(dt: number): void {
    if (this.mortarLeft > 0) {
      this.mortarLeft -= dt;
      this.mortarNext -= dt;
      if (this.mortarNext <= 0 && this.mortarFired < this.mortarTotal) {
        this.mortarNext = 0.55 + (this.mortarFired % 3) * 0.24;
        const i = this.mortarFired++;
        // A deterministic sunflower over the box rather than a random one: a
        // barrage has to photograph the same way twice.
        const golden = i * 2.39996323;
        const r = Math.sqrt((i + 0.6) / this.mortarTotal) * 17;
        headingToDir(this.mortarHeading, _dir);
        const x = this.mortarAt.x + Math.cos(golden) * r + _dir.x * (i - 6) * 1.6;
        const z = this.mortarAt.z + Math.sin(golden) * r + _dir.z * (i - 6) * 1.6;
        const y = this.deps.groundAt(x, z, this.mortarAt.y + 40);
        this.pending.push({ at: 1.5, x, y, z });
        _v.set(x, y + 6, z);
        emitSound(this.ctx, 'mortar_whistle', _v, 0.85, 0.95 + (i % 4) * 0.04);
      }
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const round = this.pending[i];
      round.at -= dt;
      if (round.at > 0) continue;
      this.pending.splice(i, 1);
      _explosion.position.set(round.x, round.y + 0.3, round.z);
      _explosion.radius = 11;
      _explosion.damage = 150;
      _explosion.scale = 1;
      _explosion.source = 'grenade';
      this.ctx.events.emit('fx:explosion', _explosion);
      this.deps.ai?.damageRadius?.(_explosion.position, 11, 150, 'mortar');
      this.deps.physics?.applyExplosionForce?.(_explosion.position, 14, 900);
      this.hurt(_explosion.position, 11, 150);
      if (this.budget.scale > 0.5) {
        this.haze.add(round.x, round.y + 2, round.z, 12, 14, 0.28, 1);
      }
    }
    if (this.mortarLeft <= 0 && this.pending.length === 0) this.mortarLeft = 0;
  }

  /* ------------------------------ helicopter ------------------------------ */

  startHelicopter(duration: number): void {
    this.heliLeft = duration;
    const bounds = this.deps.world?.bounds;
    if (bounds) {
      bounds.getCenter(this.heliCentre);
      bounds.getSize(_v);
      this.heliRadius = Math.min(78, Math.max(38, Math.min(_v.x, _v.z) * 0.42));
    } else {
      this.heliCentre.set(0, 0, 0);
    }
    this.heliCentre.y = this.deps.groundAt(this.heliCentre.x, this.heliCentre.z, 60);
    this.heliHeight = 36;
    this.heliAngle = 0;
    this.burst.left = 0;
    this.burst.cooldown = 2.4;
    this.burst.targetId = -1;
    this.heli.root.visible = true;
    emitSound(this.ctx, 'heli_inbound', undefined, 0.8);
  }

  private stepHelicopter(dt: number, time: number): void {
    if (this.heliLeft <= 0) return;
    this.heliLeft -= dt;
    if (this.heliLeft <= 0) {
      this.heli.root.visible = false;
      _aircraft.id = 'heli';
      _aircraft.kind = 'helicopter';
      _aircraft.position.copy(this.heli.root.position);
      _aircraft.active = false;
      this.ctx.events.emit('killstreak:aircraft', _aircraft);
      return;
    }

    // A left-hand orbit at about twenty-five metres a second, which is a rate
    // one turn at this radius and looks like a gun run rather than a carousel.
    const omega = 25 / this.heliRadius;
    this.heliAngle += omega * dt;
    const x = this.heliCentre.x + Math.cos(this.heliAngle) * this.heliRadius;
    const z = this.heliCentre.z + Math.sin(this.heliAngle) * this.heliRadius;
    const ground = this.deps.groundAt(x, z, this.heliCentre.y + 90);
    const y = ground + this.heliHeight;

    // Nose into the turn with the bank the turn implies, plus the nose-down
    // attitude that goes with forward flight.
    const heading = this.heliAngle + Math.PI / 2;
    headingToDir(heading, _dir);
    _v.set(x, y, z);
    _v2.copy(_v).add(_dir);
    _m.lookAt(_v, _v2, UP);
    _q.setFromRotationMatrix(_m);
    this.heli.root.position.copy(_v);
    this.heli.root.quaternion.copy(_q);
    this.heli.root.rotateZ(-0.22);
    this.heli.root.rotateX(0.09);

    this.heliRotor += dt * 32;
    this.heli.mainRotor.rotation.y = this.heliRotor;
    this.heli.tailRotor.rotation.y = this.heliRotor * 3.1;

    _aircraft.id = 'heli';
    _aircraft.kind = 'helicopter';
    _aircraft.position.copy(_v);
    _aircraft.active = true;
    this.ctx.events.emit('killstreak:aircraft', _aircraft);

    // Rotor wash. At this height it is a haze off the roofs rather than a
    // ground effect, so it is thin, short-lived and directly underneath.
    this.heliDustAt -= dt;
    if (this.heliDustAt <= 0 && this.budget.scale > 0.4) {
      this.heliDustAt = 0.85;
      this.haze.add(x, ground + 1.5, z, 7, 4.5, 0.2, 0.5);
    }

    this.engage(dt, time);
  }

  /** Acquire, track, and shoot. */
  private engage(dt: number, time: number): void {
    const ai = this.deps.ai;
    const gun = this.heli.muzzle;
    this.heli.root.updateMatrixWorld(true);

    let target: EnemyState | undefined;
    if (ai) {
      const list = ai.query(this.heli.root.position, 140);
      let best = Infinity;
      for (const enemy of list) {
        if (!enemy.alive) continue;
        const d = enemy.position.distanceToSquared(this.heli.root.position);
        if (d < best) {
          best = d;
          target = enemy;
        }
      }
    }

    if (target) {
      this.heliAim.copy(target.position).addScaledVector(UP, 0.9);
      // The turret leads its own tracking rather than snapping, which is what
      // makes the gun look like it is being aimed by something.
      this.heli.turret.updateMatrixWorld(true);
      _v.copy(this.heliAim);
      this.heli.root.worldToLocal(_v);
      const yaw = Math.atan2(_v.x, -_v.z);
      const pitch = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
      const k = 1 - Math.exp(-dt * 6);
      this.heli.turret.rotation.y += (yaw - this.heli.turret.rotation.y) * k;
      this.heli.turret.rotation.x += (pitch - this.heli.turret.rotation.x) * k;
    }

    this.burst.cooldown -= dt;
    if (this.burst.left > 0) {
      this.burst.left -= dt;
      if (target) {
        // 20 mm at 700 rpm: a round every 86 ms, but the tracer rate is what
        // the eye counts and one in three is right for a chin gun.
        const period = 0.086 * 3;
        if (Math.floor(time / period) !== Math.floor((time - dt) / period)) {
          this.fireBurst(gun, target);
        }
      }
      if (this.burst.left <= 0) this.burst.cooldown = 1.6 + (this.heliAngle % 1) * 1.4;
    } else if (this.burst.cooldown <= 0 && target) {
      this.burst.left = 1.1;
      this.burst.targetId = target.id;
    }
  }

  private fireBurst(gun: THREE.Object3D, target: EnemyState): void {
    gun.getWorldPosition(_v);
    _tracer.origin.copy(_v);
    // Dispersion, deterministic in the target's id so the same engagement
    // photographs the same way.
    const jitter = ((target.id * 37) % 17) / 17 - 0.5;
    _tracer.end
      .copy(target.position)
      .addScaledVector(UP, 0.9 + jitter * 0.6)
      .addScaledVector(_dir.set(1, 0, 0), jitter * 1.4);
    _tracer.speed = 1030;
    _tracer.caliber = 20;
    _tracer.fromPlayer = true;
    this.ctx.events.emit('fx:tracer', _tracer);
    emitSound(this.ctx, 'heli_gun', _v, 0.55, 1);

    // Real damage. A 20 mm burst on a soldier in the open is decisive, so the
    // helicopter genuinely takes kills rather than decorating the sky.
    this.deps.ai?.damageRadius?.(target.position, 2.4, 62, 'helicopter');
  }

  /* -------------------------------- gunship -------------------------------- */

  startGunship(duration: number): void {
    this.gunshipLeft = duration;
    this.gunshipAngle = 0;
    this.gunshipCool = 0;
    this.gunshipRounds.length = 0;
    const bounds = this.deps.world?.bounds;
    if (bounds) bounds.getCenter(this.gunshipCentre);
    this.gunshipCentre.y = this.deps.groundAt(this.gunshipCentre.x, this.gunshipCentre.z, 80);
    this.gunshipAim.copy(this.gunshipCentre);
    emitSound(this.ctx, 'gunship_online', undefined, 0.9);
    this.ctx.events.emit('ui:notify', {
      title: 'AC-130 ON STATION',
      subtitle: 'You have the gun',
      duration: 3,
      tone: 'positive',
    });
  }

  /**
   * The gunner's seat.
   *
   * The camera goes to the orbit and the reticle goes on the mouse. Rounds have
   * a real time of flight — a second and a half at this slant range — so the
   * player has to lead a moving target, which is the entire skill of the thing
   * and the reason it is fun rather than a cursor over a slaughter.
   */
  stepGunship(
    dt: number,
    aimX: number,
    aimY: number,
    firePrimary: boolean,
    fireSecondary: boolean,
    camera: THREE.PerspectiveCamera,
  ): boolean {
    if (this.gunshipLeft <= 0) return false;
    this.gunshipLeft -= dt;

    const radius = 210;
    const height = 260;
    this.gunshipAngle += (24 / radius) * dt;
    camera.position.set(
      this.gunshipCentre.x + Math.cos(this.gunshipAngle) * radius,
      this.gunshipCentre.y + height,
      this.gunshipCentre.z + Math.sin(this.gunshipAngle) * radius,
    );

    // The aim point is driven in world metres rather than in screen space, so
    // it does not slide across the map as the aircraft orbits around it.
    this.gunshipAim.x += aimX * 90;
    this.gunshipAim.z += aimY * 90;
    const bounds = this.deps.world?.bounds;
    if (bounds) {
      this.gunshipAim.x = Math.min(bounds.max.x, Math.max(bounds.min.x, this.gunshipAim.x));
      this.gunshipAim.z = Math.min(bounds.max.z, Math.max(bounds.min.z, this.gunshipAim.z));
    }
    this.gunshipAim.y = this.deps.groundAt(this.gunshipAim.x, this.gunshipAim.z, height);
    camera.lookAt(this.gunshipAim);
    camera.updateMatrixWorld(true);

    this.gunshipCool -= dt;
    if (this.gunshipCool <= 0 && (firePrimary || fireSecondary)) {
      const big = firePrimary;
      this.gunshipCool = big ? 2.6 : 0.55;
      this.gunshipRounds.push({
        at: big ? 1.6 : 1.1,
        x: this.gunshipAim.x,
        y: this.gunshipAim.y,
        z: this.gunshipAim.z,
        big,
      });
      emitSound(this.ctx, big ? 'gunship_105' : 'gunship_40', undefined, big ? 1 : 0.6);
    }

    for (let i = this.gunshipRounds.length - 1; i >= 0; i--) {
      const round = this.gunshipRounds[i];
      round.at -= dt;
      if (round.at > 0) continue;
      this.gunshipRounds.splice(i, 1);
      _explosion.position.set(round.x, round.y + 0.4, round.z);
      _explosion.radius = round.big ? 20 : 9;
      _explosion.damage = round.big ? 300 : 120;
      _explosion.scale = round.big ? 1.2 : 0.9;
      _explosion.source = round.big ? 'airstrike' : 'grenade';
      this.ctx.events.emit('fx:explosion', _explosion);
      this.deps.ai?.damageRadius?.(
        _explosion.position,
        _explosion.radius,
        _explosion.damage,
        'gunship',
      );
      this.deps.physics?.applyExplosionForce?.(
        _explosion.position,
        _explosion.radius * 1.3,
        _explosion.damage * 6,
      );
      this.hurt(_explosion.position, _explosion.radius, _explosion.damage);
      _shake.amplitude = round.big ? 0.16 : 0.07;
      _shake.duration = 0.5;
      _shake.position.copy(_explosion.position);
      _shake.radius = 160;
      this.ctx.events.emit('camera:shake', _shake);
    }

    if (this.gunshipLeft <= 0) {
      this.gunshipLeft = 0;
      _aircraft.id = 'gunship';
      _aircraft.kind = 'gunship';
      _aircraft.position.copy(camera.position);
      _aircraft.active = false;
      this.ctx.events.emit('killstreak:aircraft', _aircraft);
      return false;
    }
    return true;
  }

  /* --------------------------------- frame --------------------------------- */

  step(dt: number, time: number): void {
    this.stepUav(dt);
    this.stepPackage(dt);
    this.stepMortars(dt);
    this.stepHelicopter(dt, time);
  }

  private hurt(at: THREE.Vector3, radius: number, damage: number): void {
    const player = this.deps.player;
    if (!player?.alive) return;
    const distance = player.position.distanceTo(at);
    if (distance > radius) return;
    const falloff = 1 - distance / radius;
    player.damage({
      amount: damage * falloff * falloff,
      kind: 'explosion',
      from: at,
      attacker: 'player',
    });
  }

  clear(): void {
    if (this.uavLeft > 0) {
      this.ctx.events.emit('killstreak:uav', { active: false, duration: 0, sweepPeriod: 2.2 });
    }
    this.uavLeft = 0;
    this.packageLeft = 0;
    this.mortarLeft = 0;
    this.mortarFired = this.mortarTotal;
    this.pending.length = 0;
    this.heliLeft = 0;
    this.gunshipLeft = 0;
    this.gunshipRounds.length = 0;
    this.crate.root.visible = false;
    this.heli.root.visible = false;
  }

  dispose(): void {
    this.clear();
    this.crate.dispose();
    this.heliAssets.dispose();
    this.group.removeFromParent();
  }
}
