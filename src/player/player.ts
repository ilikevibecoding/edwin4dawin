import * as THREE from 'three';
import { clamp, clamp01, damp, lerp, smoothstep, TAU } from '../core/math';
import { Input } from '../core/input';
import { Environment } from '../world/environment';
import { IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { Ship } from '../ship/ship';
import { Blocker, Ladder, WalkSurface } from '../ship/shipbuilder';
import { Avatar, AvatarPose } from './avatar';
import { buildItemMesh, HOTBAR, ItemKind, VIEW_HOLD } from './items';
import { MeshBuilder } from '../core/meshbuilder';

export type PlayerMode = 'ship' | 'land' | 'swim' | 'climb' | 'dead';

const EYE_HEIGHT = 1.62;
const BODY_HEIGHT = 1.78;
const BODY_RADIUS = 0.32;
const STEP_HEIGHT = 0.62;
/** How long a cutlass stroke takes, start of wind-up to end of follow-through. */
const SWING_TIME = 0.44;
const WALK_SPEED = 3.3;
const RUN_SPEED = 5.7;
const SWIM_SPEED = 2.5;
const CLIMB_SPEED = 2.4;
const GRAVITY = 20;
const JUMP_SPEED = 6.1;
const CAMERA_TILT = 0.85;

export interface PlayerContext {
  ships: Ship[];
  ocean: Ocean;
  islands: IslandField;
  env: Environment;
}

export interface HeldState {
  kind: ItemKind;
  aiming: boolean;
}

/**
 * First/third person pirate controller. The player lives in one of two reference
 * frames: aboard a ship (position stored in ship-local space, so the deck carries
 * them as it pitches and rolls) or in the world (land, water, mid-air).
 */
export class Player {
  readonly avatar = new Avatar();
  readonly group = new THREE.Group();

  mode: PlayerMode = 'ship';
  /** Feet position in the active frame. */
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  /** Camera Euler yaw, in the active frame. */
  yaw = 0;
  pitch = 0;

  ship: Ship | null = null;
  onGround = false;
  ladder: Ladder | null = null;

  health = 100;
  maxHealth = 100;
  dead = false;
  deathReason = '';

  /** When set, the player is locked to a station on the ship (helm, cannon...). */
  stationLock: THREE.Vector3 | null = null;
  /** Raises or lowers the eye at a station - crouching behind a cannon, say. */
  eyeOffset = 0;

  slot = 0;
  // Starting shot for the flintlock. Without it the very first thing the pistol
  // ever does is tell you it has no powder, and the only place to get any was the
  // cannonball barrel.
  itemCounts: Record<string, number> = { planks: 5, banana: 3, cannonballs: 12, shots: 8 };
  lanternOn = false;
  firstPerson = true;
  /** Overrides the avatar pose while working a station (helm, capstan, ...). */
  stationPose: AvatarPose | null = null;
  /** Drives the station pose - for the helm this is the wheel angle, -1..1. */
  stationParam = 0;

  /** Set while the player is carrying loot: slows them and blocks item use. */
  carrying: THREE.Object3D | null = null;

  private heldMesh: THREE.Object3D | null = null;
  private heldKind: ItemKind = 'none';
  private viewModel = new THREE.Group();
  private viewHand = new THREE.Group();
  private viewSwing = 0;
  /** Counts 1 -> 0 across a stroke or a shot; see `updateViewModel`. */
  private swingPhase = 0;
  private swingStyle: 'slash' | 'shot' | 'thump' = 'thump';
  private idlePhase = 0;
  private strokePhase = 0;
  private swimRoll = 0;
  private swimPitch = 0;
  private cameraDistance = 3.4;
  private headBob = 0;
  private bobPhase = 0;
  private footstepTimer = 0;
  private airTime = 0;
  private submergedTime = 0;
  private swingTimer = 0;
  private worldPosition = new THREE.Vector3();
  private frameQuaternion = new THREE.Quaternion();
  private scratch = new THREE.Vector3();
  private scratchB = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();

  onFootstep: (onWood: boolean, running: boolean) => void = () => {};
  onSplash: (strength: number) => void = () => {};
  onHurt: () => void = () => {};

  readonly lantern = new THREE.PointLight(0xffb867, 0, 18, 1);

  constructor() {
    this.group.add(this.avatar.root);
    this.group.add(this.lantern);
    this.lantern.position.set(0, 1.1, 0);

    // First-person viewmodel: a forearm and the held item, parented to the camera.
    this.viewModel.name = 'viewmodel';
    this.viewHand.position.set(0.2, -0.1, -0.62);
    this.viewHand.rotation.set(-0.12, -0.36, 0.1);
    this.viewModel.add(this.viewHand);
    // A fist on the grip, and nothing more.
    //
    // Anything drawn behind the grip is between the eye and the weapon, so a
    // forearm running back towards the camera does not read as an arm: it reads as
    // a flat coloured square in the middle of the screen with the weapon hidden
    // behind it, because what you are looking at is its end face. A hand closed
    // round the hilt sits inside the silhouette of the guard and stays out of the
    // way of the thing it is holding.
    const arm = new MeshBuilder();
    arm.addBox({ x: 0, y: 0.004, z: 0.045 }, { x: 0.076, y: 0.074, z: 0.1 }, 0xa9744a);
    for (let i = 0; i < 4; i++) {
      arm.addBox(
        { x: -0.028 + i * 0.019, y: -0.038, z: 0.012 },
        { x: 0.018, y: 0.046, z: 0.082 },
        i % 2 ? 0xb8845a : 0xa9744a,
      );
    }
    arm.addBox({ x: 0.034, y: 0.004, z: 0.014 }, { x: 0.028, y: 0.05, z: 0.07 }, 0xbc8a5e);
    const armMesh = new THREE.Mesh(
      arm.build(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
    );
    this.viewHand.add(armMesh);

    this.equip(0);
  }

  get worldPos(): THREE.Vector3 {
    return this.worldPosition;
  }

  get eyeWorld(): THREE.Vector3 {
    return this.scratchB.copy(this.worldPosition).setY(this.worldPosition.y + EYE_HEIGHT + this.eyeOffset + this.headBob);
  }

  get held(): ItemKind {
    return this.heldKind;
  }

  get isAboard(): boolean {
    return (this.mode === 'ship' || this.mode === 'climb') && this.ship !== null;
  }

  /** The viewmodel group, to be parented to the camera by the game. */
  get viewModelGroup(): THREE.Group {
    return this.viewModel;
  }

  boardShip(ship: Ship, localPosition: THREE.Vector3): void {
    if (this.ship !== ship) {
      this.yaw += ship.heading - (this.ship?.heading ?? 0);
    }
    this.ship = ship;
    this.mode = 'ship';
    this.position.copy(localPosition);
    this.velocity.set(0, 0, 0);
  }

  /** Moves the player into world space, keeping their world position and facing. */
  private leaveShip(): void {
    if (!this.ship) return;
    const world = this.ship.localToWorld(this.position.clone());
    const worldVelocity = this.velocity.clone().applyQuaternion(this.ship.group.quaternion);
    worldVelocity.x += this.ship.velocity.x;
    worldVelocity.z += this.ship.velocity.z;
    this.yaw -= this.ship.heading;
    this.position.copy(world);
    this.velocity.copy(worldVelocity);
    this.ship = null;
    this.stationLock = null;
    this.mode = 'land';
  }

  equip(slot: number): void {
    this.slot = clamp(slot, 0, HOTBAR.length - 1);
    const def = HOTBAR[this.slot];
    if (def.kind === this.heldKind) return;
    this.setHeld(def.kind);
  }

  private setHeld(kind: ItemKind): void {
    if (this.heldMesh) {
      this.heldMesh.removeFromParent();
      this.heldMesh = null;
    }
    this.heldKind = kind;
    const mesh = buildItemMesh(kind);
    if (!mesh) return;
    this.heldMesh = mesh;
    this.attachHeld();
  }

  /** Items live either in the avatar's hand or in the first-person viewmodel. */
  private attachHeld(): void {
    if (!this.heldMesh) return;
    const parent = this.firstPerson ? this.viewHand : this.avatar.hand;
    if (this.heldMesh.parent === parent) return;
    parent.add(this.heldMesh);
    // Framing is for the first-person view only; the avatar's fist has its own
    // orientation and wants the item square in it.
    const hold = this.firstPerson ? VIEW_HOLD[this.heldKind] : undefined;
    this.heldMesh.position.set(hold ? hold.pos[0] : 0, hold ? hold.pos[1] : 0, hold ? hold.pos[2] : 0);
    this.heldMesh.rotation.set(hold ? hold.rot[0] : 0, hold ? hold.rot[1] : 0, hold ? hold.rot[2] : 0);
  }

  count(item: string): number {
    return this.itemCounts[item] ?? 0;
  }

  consume(item: string, amount = 1): boolean {
    if (this.count(item) < amount) return false;
    this.itemCounts[item] -= amount;
    return true;
  }

  give(item: string, amount = 1, max = 99): void {
    this.itemCounts[item] = Math.min(max, this.count(item) + amount);
  }

  damage(amount: number, reason: string): void {
    if (this.dead) return;
    this.health -= amount;
    this.onHurt();
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.mode = 'dead';
      this.deathReason = reason;
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  respawnOn(ship: Ship): void {
    this.dead = false;
    this.health = this.maxHealth;
    this.mode = 'ship';
    this.ship = ship;
    this.position.copy(ship.model.anchors.spawn.position);
    this.velocity.set(0, 0, 0);
    this.stationLock = null;
    this.carrying = null;
  }

  // ------------------------------------------------------------------ input

  handleLook(input: Input): void {
    if (!input.pointerLocked) return;
    const sensitivity = this.heldKind === 'spyglass' ? 0.42 : 1;
    this.yaw -= input.mouseDX * sensitivity;
    this.pitch = clamp(this.pitch - input.mouseDY * sensitivity, -1.45, 1.45);
  }

  /** Horizontal look direction in the active frame. */
  private lookForward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  private lookRight(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** Full look direction including pitch, in the active frame. */
  lookDirection(out = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  /** Look direction in world space, for aiming and interaction rays. */
  worldLookDirection(out = new THREE.Vector3()): THREE.Vector3 {
    this.lookDirection(out);
    if (this.ship) out.applyQuaternion(this.ship.group.quaternion);
    return out.normalize();
  }

  // ----------------------------------------------------------------- update

  update(dt: number, input: Input, ctx: PlayerContext): void {
    if (this.dead) {
      this.updateWorldTransform(ctx);
      return;
    }

    const wantsRun = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const moveForward = input.axis('KeyS', 'KeyW');
    const moveRight = input.axis('KeyA', 'KeyD');

    switch (this.mode) {
      case 'ship':
        this.updateOnShip(dt, moveForward, moveRight, wantsRun, input, ctx);
        break;
      case 'climb':
        this.updateClimbing(dt, moveForward, input, ctx);
        break;
      case 'land':
        this.updateInWorld(dt, moveForward, moveRight, wantsRun, input, ctx);
        break;
      case 'swim':
        this.updateSwimming(dt, moveForward, moveRight, input, ctx);
        break;
      default:
        break;
    }

    this.updateWorldTransform(ctx);
    this.updateAvatar(dt, ctx);
  }

  /** Desired horizontal move direction in the active frame. */
  private moveVector(moveForward: number, moveRight: number, out: THREE.Vector3): number {
    out.set(0, 0, 0);
    if (moveForward === 0 && moveRight === 0) return 0;
    out.addScaledVector(this.lookForward(this.scratch), moveForward);
    out.addScaledVector(this.lookRight(this.scratch), moveRight);
    const length = out.length();
    if (length > 0.0001) out.multiplyScalar(1 / length);
    return Math.min(1, length);
  }

  private speedFor(run: boolean): number {
    let speed = run ? RUN_SPEED : WALK_SPEED;
    if (this.carrying) speed *= 0.62;
    if (this.heldKind === 'spyglass') speed *= 0.75;
    return speed;
  }

  // ------------------------------------------------------------ aboard ship

  private updateOnShip(
    dt: number,
    moveForward: number,
    moveRight: number,
    run: boolean,
    input: Input,
    ctx: PlayerContext,
  ): void {
    const ship = this.ship!;
    if (ship.destroyed) {
      this.leaveShip();
      return;
    }

    // Manning a station pins the player in place.
    if (this.stationLock) {
      this.position.lerp(this.stationLock, 1 - Math.exp(-12 * dt));
      this.velocity.set(0, 0, 0);
      this.onGround = true;
      return;
    }

    const desired = new THREE.Vector3();
    const intensity = this.moveVector(moveForward, moveRight, desired);
    const target = desired.multiplyScalar(this.speedFor(run) * intensity);

    // Wading through flood water in the hold is slow going.
    const wade = clamp01(ship.holdWaterDepth(this.position.y) / 1.2);
    const speedScale = this.position.y < 0.4 ? 1 - wade * 0.45 : 1;
    target.multiplyScalar(speedScale);

    const accel = this.onGround ? 26 : 8;
    this.velocity.x = damp(this.velocity.x, target.x, accel, dt);
    this.velocity.z = damp(this.velocity.z, target.z, accel, dt);
    this.velocity.y -= GRAVITY * dt;

    if (this.onGround && input.wasPressed('Space')) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }

    const before = this.position.clone();
    this.position.addScaledVector(this.velocity, dt);
    this.resolveBlockers(ship.model.collision.blockers, before);

    // Support surface under the feet.
    const support = this.findSurface(ship.model.collision.surfaces, this.position, this.velocity.y);
    if (support !== null && this.position.y <= support + 0.02) {
      if (this.velocity.y < -9) this.onLanded(-this.velocity.y, ctx);
      this.position.y = support;
      this.velocity.y = 0;
      this.onGround = true;
      this.airTime = 0;
    } else {
      this.onGround = false;
      this.airTime += dt;
    }

    // Ladders: grab them when climbing on deliberately, or when brushing past
    // one at low speed. A long drop through the hatch is not a handhold.
    const ladder = this.findLadder(ship.model.collision.ladders, this.position);
    const deliberate = moveForward > 0;
    const gentleFall = !this.onGround && this.velocity.y > -4.5;
    if (ladder && (deliberate || gentleFall)) {
      this.ladder = ladder;
      this.mode = 'climb';
      this.velocity.set(0, 0, 0);
      return;
    }

    // Leaving the ship: only once the player is genuinely outside the hull. The
    // hold sits below the waterline, so "am I under water" is not a valid test
    // while aboard - it would eject anyone walking below deck.
    if (!ship.containsLocal(this.position)) {
      const world = ship.localToWorld(this.position.clone());
      const waterHeight = ctx.ocean.waterHeight(world.x, world.z);
      this.leaveShip();
      if (world.y < waterHeight + 0.5) this.enterWater(ctx, world);
      return;
    }

    this.updateFootsteps(dt, true, run);
  }

  private updateClimbing(dt: number, moveForward: number, input: Input, ctx: PlayerContext): void {
    const ship = this.ship;
    const ladder = this.ladder;
    if (!ship || !ladder || ship.destroyed) {
      this.mode = this.ship ? 'ship' : 'land';
      return;
    }

    // Centre on the ladder and climb.
    const centreX = (ladder.minX + ladder.maxX) / 2;
    const centreZ = (ladder.minZ + ladder.maxZ) / 2;
    this.position.x = damp(this.position.x, centreX, 9, dt);
    this.position.z = damp(this.position.z, centreZ, 9, dt);
    this.position.y += moveForward * CLIMB_SPEED * dt;
    this.velocity.set(0, 0, 0);
    this.onGround = true;

    if (input.wasPressed('Space')) {
      // Hop off the ladder.
      this.mode = 'ship';
      this.ladder = null;
      this.velocity.y = 3.2;
      return;
    }

    if (this.position.y >= ladder.topY) {
      // Step off at the top, forwards onto the deck.
      this.position.y = ladder.topY;
      const forward = this.lookForward(this.scratch).multiplyScalar(0.75);
      this.position.x += forward.x;
      this.position.z += forward.z;
      this.mode = 'ship';
      this.ladder = null;
      return;
    }

    if (this.position.y <= ladder.bottomY) {
      this.position.y = ladder.bottomY;
      const world = ship.localToWorld(this.position.clone());
      if (world.y < ctx.ocean.waterHeight(world.x, world.z)) {
        this.leaveShip();
        this.enterWater(ctx, world);
      } else {
        this.mode = 'ship';
      }
      this.ladder = null;
    }
  }

  // -------------------------------------------------------- land and water

  private updateInWorld(
    dt: number,
    moveForward: number,
    moveRight: number,
    run: boolean,
    input: Input,
    ctx: PlayerContext,
  ): void {
    const desired = new THREE.Vector3();
    const intensity = this.moveVector(moveForward, moveRight, desired);
    const terrain = ctx.islands.heightAt(this.position.x, this.position.z);
    const slope = ctx.islands.slopeAt(this.position.x, this.position.z);
    // Steep ground slows the climb, like scrambling up a rocky spine.
    const target = desired.multiplyScalar(this.speedFor(run) * intensity * (1 - clamp01(slope - 0.25) * 0.8));

    const accel = this.onGround ? 22 : 7;
    this.velocity.x = damp(this.velocity.x, target.x, accel, dt);
    this.velocity.z = damp(this.velocity.z, target.z, accel, dt);
    this.velocity.y -= GRAVITY * dt;

    if (this.onGround && input.wasPressed('Space')) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }

    this.position.addScaledVector(this.velocity, dt);

    const ground = ctx.islands.heightAt(this.position.x, this.position.z);
    if (this.position.y <= ground) {
      if (this.velocity.y < -9) this.onLanded(-this.velocity.y, ctx);
      this.position.y = ground;
      this.velocity.y = 0;
      this.onGround = true;
      this.airTime = 0;
    } else {
      this.onGround = false;
      this.airTime += dt;
    }

    const waterHeight = ctx.ocean.waterHeight(this.position.x, this.position.z);
    if (this.position.y + BODY_HEIGHT * 0.55 < waterHeight) {
      this.enterWater(ctx, this.position);
      return;
    }

    // Climbing aboard a ship: the boarding ladders are ship-local volumes.
    if (this.tryBoard(ctx)) return;
    void terrain;
    this.updateFootsteps(dt, false, run);
  }

  private updateSwimming(dt: number, moveForward: number, moveRight: number, input: Input, ctx: PlayerContext): void {
    const surface = ctx.ocean.waterHeight(this.position.x, this.position.z);
    const headY = this.position.y + BODY_HEIGHT;
    const submerged = clamp01((surface - headY) * 0.9 + 0.2);

    const desired = new THREE.Vector3();
    const intensity = this.moveVector(moveForward, moveRight, desired);
    const diving = input.isDown('ControlLeft') || input.isDown('KeyC');
    const sprint = input.isDown('ShiftLeft');

    /*
     * Swimming is not walking at a lower speed.
     *
     * It used to be exactly that - the same yaw-relative move vector damped
     * towards the same kind of constant target, which is why it felt like walking
     * with the numbers turned down. What makes swimming read as swimming is that
     * it is not continuous: you pull, you surge, you glide while you recover, and
     * the whole time the swell is lifting you. So the drive comes in strokes, and
     * between strokes there is nothing but glide.
     */
    if (intensity > 0.05) {
      this.strokePhase += dt * (sprint ? 2.3 : 1.65);
    } else {
      // Treading water: a slow scull, no forward drive.
      this.strokePhase += dt * 0.6;
    }
    const cycle = this.strokePhase % 1;
    // A hard catch through the first third of the cycle, then recovery.
    const pull = cycle < 0.34 ? Math.sin((cycle / 0.34) * Math.PI) : 0;
    const reach = SWIM_SPEED * intensity * (this.carrying ? 0.55 : 1) * (sprint ? 1.5 : 1);
    // Thrust while the arm is pulling; drag the rest of the time. Glide drag is
    // deliberately light, so a stroke carries you and letting go coasts to a stop
    // rather than braking.
    const stroke = pull * reach * 3.4;
    this.velocity.x += (desired.x * stroke - this.velocity.x * 1.9) * dt;
    this.velocity.z += (desired.z * stroke - this.velocity.z * 1.9) * dt;

    // Bob up to the surface unless actively diving, and ride the swell rather than
    // holding a fixed depth in it: the wave lifts the swimmer with it.
    const kick = 1 + pull * 0.8;
    const targetFeet = surface - BODY_HEIGHT * (diving ? 0.95 : 0.72 - pull * 0.05);
    const buoyancy = (targetFeet - this.position.y) * 7 - this.velocity.y * 3.2;
    this.velocity.y = damp(this.velocity.y, 0, 2, dt) + buoyancy * dt;
    if (diving) this.velocity.y -= 5 * dt;
    if (input.isDown('Space')) this.velocity.y += 6 * dt * kick;

    // Roll and pitch with the stroke, and let the horizon tilt with it. This is
    // most of what tells you at a glance that you are in the water.
    this.swimRoll = damp(this.swimRoll, Math.sin(this.strokePhase * TAU) * 0.13 * intensity, 6, dt);
    this.swimPitch = damp(this.swimPitch, pull * 0.09 - 0.03, 7, dt);

    // Waves push swimmers around.
    const flow = ctx.env.waves.flow(this.position.x, this.position.z, this.scratch);
    this.position.x += (this.velocity.x + flow.x * 0.35) * dt;
    this.position.z += (this.velocity.z + flow.z * 0.35) * dt;
    this.position.y += this.velocity.y * dt;

    const ground = ctx.islands.heightAt(this.position.x, this.position.z);
    if (this.position.y < ground) {
      this.position.y = ground;
      this.velocity.y = Math.max(0, this.velocity.y);
      // Wading ashore.
      if (surface - ground < BODY_HEIGHT * 0.5) {
        this.mode = 'land';
        this.onGround = true;
        return;
      }
    }

    if (this.position.y > surface - BODY_HEIGHT * 0.45 && ground > surface - 0.6) {
      this.mode = 'land';
      return;
    }

    // Drowning: staying fully under costs air, then health.
    if (submerged > 0.85) {
      this.submergedTime += dt;
      if (this.submergedTime > 14) {
        this.submergedTime = 12.5;
        this.damage(9, 'Ye drowned in the deep.');
      }
    } else {
      this.submergedTime = Math.max(0, this.submergedTime - dt * 2);
    }

    this.tryBoard(ctx);
  }

  private enterWater(ctx: PlayerContext, world: THREE.Vector3): void {
    if (this.mode === 'swim') return;
    const impact = Math.max(0, -this.velocity.y);
    this.mode = 'swim';
    this.ship = null;
    this.stationLock = null;
    this.position.copy(world);
    this.velocity.y *= 0.25;
    this.onGround = false;
    if (impact > 2) this.onSplash(clamp01(impact / 12));
    void ctx;
  }

  /** Grabs a ship's boarding ladder if the player is swimming beside one. */
  private tryBoard(ctx: PlayerContext): boolean {
    for (const ship of ctx.ships) {
      if (ship.destroyed || ship.sinking) continue;
      if (ship.distanceTo(this.position) > 22) continue;
      const local = ship.worldToLocal(this.position.clone());
      const ladder = this.findLadder(ship.model.collision.ladders, local, 0.75);
      if (ladder) {
        this.yaw += ship.heading;
        this.ship = ship;
        this.ladder = ladder;
        this.mode = 'climb';
        this.position.copy(local);
        this.velocity.set(0, 0, 0);
        return true;
      }
      // Stepping straight onto a deck (e.g. jumping between ships).
      if (ship.containsLocal(local)) {
        const support = this.findSurface(ship.model.collision.surfaces, local, -1);
        if (support !== null && Math.abs(local.y - support) < 1.2) {
          this.yaw += ship.heading;
          this.boardShip(ship, local.setY(support));
          return true;
        }
      }
    }
    return false;
  }

  // ------------------------------------------------------------- collision

  /** Highest walkable surface at or just below the feet, or null if none. */
  private findSurface(surfaces: WalkSurface[], position: THREE.Vector3, verticalVelocity: number): number | null {
    let best: number | null = null;
    // Rising through a deck should not snap us onto it.
    const reach = verticalVelocity > 0.1 ? 0.05 : STEP_HEIGHT;
    for (const surface of surfaces) {
      if (position.x < surface.minX || position.x > surface.maxX) continue;
      if (position.z < surface.minZ || position.z > surface.maxZ) continue;
      if (surface.holes?.some((h) => position.x > h.minX && position.x < h.maxX && position.z > h.minZ && position.z < h.maxZ)) {
        continue;
      }
      const t = (position.x - surface.minX) / Math.max(0.001, surface.maxX - surface.minX);
      const y = lerp(surface.y0, surface.y1, t);
      if (y > position.y + reach) continue;
      if (best === null || y > best) best = y;
    }
    return best;
  }

  private findLadder(ladders: Ladder[], position: THREE.Vector3, padding = 0): Ladder | null {
    for (const ladder of ladders) {
      if (position.x < ladder.minX - padding || position.x > ladder.maxX + padding) continue;
      if (position.z < ladder.minZ - padding || position.z > ladder.maxZ + padding) continue;
      if (position.y < ladder.bottomY - 1.4 || position.y > ladder.topY + 0.4) continue;
      return ladder;
    }
    return null;
  }

  /** Pushes the capsule out of solid volumes, allowing small steps up. */
  private resolveBlockers(blockers: Blocker[], previous: THREE.Vector3): void {
    const feetY = this.position.y;
    const headY = feetY + BODY_HEIGHT;

    for (const blocker of blockers) {
      if (headY < blocker.minY || feetY > blocker.maxY) continue;
      const overlapX = Math.min(this.position.x + BODY_RADIUS - blocker.minX, blocker.maxX - (this.position.x - BODY_RADIUS));
      const overlapZ = Math.min(this.position.z + BODY_RADIUS - blocker.minZ, blocker.maxZ - (this.position.z - BODY_RADIUS));
      if (overlapX <= 0 || overlapZ <= 0) continue;

      // Step up onto low obstacles instead of stopping dead.
      if (blocker.maxY - feetY <= STEP_HEIGHT && blocker.maxY > feetY) {
        this.position.y = blocker.maxY;
        if (this.velocity.y < 0) this.velocity.y = 0;
        this.onGround = true;
        continue;
      }

      if (overlapX < overlapZ) {
        const push = this.position.x < (blocker.minX + blocker.maxX) / 2 ? -overlapX : overlapX;
        this.position.x += push;
        this.velocity.x = 0;
      } else {
        const push = this.position.z < (blocker.minZ + blocker.maxZ) / 2 ? -overlapZ : overlapZ;
        this.position.z += push;
        this.velocity.z = 0;
      }
    }
    void previous;
  }

  private onLanded(speed: number, ctx: PlayerContext): void {
    if (speed > 15) {
      this.damage((speed - 15) * 6, 'Ye fell from a great height.');
    }
    void ctx;
  }

  private updateFootsteps(dt: number, onWood: boolean, running: boolean): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.onGround || speed < 0.6) {
      this.footstepTimer = 0.12;
      return;
    }
    this.footstepTimer -= dt * speed * (running ? 0.55 : 0.68);
    if (this.footstepTimer <= 0) {
      this.footstepTimer = 0.62;
      this.onFootstep(onWood, running);
    }
  }

  // -------------------------------------------------------------- transform

  private updateWorldTransform(ctx: PlayerContext): void {
    if (this.ship) {
      this.ship.localToWorld(this.position.clone(), this.worldPosition);
      const tilt = CAMERA_TILT;
      this.frameQuaternion.setFromEuler(
        new THREE.Euler(this.ship.roll * tilt, -this.ship.heading, this.ship.pitch * tilt, 'YZX'),
      );
    } else {
      this.worldPosition.copy(this.position);
      this.frameQuaternion.identity();
    }

    this.group.position.copy(this.worldPosition);
    this.group.quaternion.copy(this.frameQuaternion);
    void ctx;
  }

  private updateAvatar(dt: number, ctx: PlayerContext): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    let pose: AvatarPose = 'idle';
    if (this.stationPose) pose = this.stationPose;
    else if (this.mode === 'swim') pose = 'swim';
    else if (this.mode === 'climb') pose = 'climb';
    else if (!this.onGround && this.airTime > 0.35) pose = 'fall';
    else if (speed > 4.2) pose = 'run';
    else if (speed > 0.5) pose = 'walk';

    if (this.swingTimer > 0) this.swingTimer -= dt;

    this.avatar.update(dt, pose, speed, this.pitch, this.stationParam);
    // The avatar faces the look direction; yaw is already in the active frame.
    this.avatar.root.rotation.y = this.yaw + Math.PI;
    // Blocky arms fill half the screen from eye height, so first person keeps the
    // body hidden; the station poses are for the third-person camera.
    this.avatar.setVisible(!this.firstPerson);
    this.viewModel.visible = this.firstPerson && this.stationPose === null;
    this.attachHeld();

    this.updateViewModel(dt, speed);
    if (this.mode !== 'swim') {
      this.swimRoll = damp(this.swimRoll, 0, 8, dt);
      this.swimPitch = damp(this.swimPitch, 0, 8, dt);
    }

    this.bobPhase += dt * speed * 2.1;
    const bobTarget = this.onGround ? Math.sin(this.bobPhase) * Math.min(0.05, speed * 0.012) : 0;
    this.headBob = damp(this.headBob, bobTarget, 12, dt);

    const night = ctx.env.uniforms.uNightFactor.value as number;
    this.lantern.intensity = this.lanternOn ? 7 : 0;
    this.lantern.color.setHex(0xffb867);
    void night;
  }

  /** Positions the camera for the current view mode. */
  updateCamera(camera: THREE.PerspectiveCamera, ctx: PlayerContext, dt: number): void {
    const localEye = this.scratch.set(
      this.position.x,
      this.position.y + EYE_HEIGHT + this.eyeOffset + this.headBob,
      this.position.z,
    );
    const eyeWorld = this.ship ? this.ship.localToWorld(localEye.clone()) : localEye.clone();

    // In the water the head rolls and pitches with each stroke, which is most of
    // what makes swimming look like swimming from inside it.
    const localQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.pitch + this.swimPitch, this.yaw, this.swimRoll, 'YXZ'),
    );
    const worldQuat = this.frameQuaternion.clone().multiply(localQuat);

    if (this.dead) {
      // Drift upwards while the Ferry claims you.
      camera.position.lerp(eyeWorld.clone().add(new THREE.Vector3(0, 3.5, 0)), 1 - Math.exp(-dt * 1.2));
      camera.quaternion.slerp(worldQuat, 1 - Math.exp(-dt * 2));
      return;
    }

    if (this.firstPerson) {
      camera.position.copy(eyeWorld);
      camera.quaternion.copy(worldQuat);
    } else {
      // Over-the-shoulder: sitting the camera off to one side keeps the player's
      // own back from hiding whatever they are working on, like the ship's wheel.
      const offset = new THREE.Vector3(0.55, 0, 1).applyQuaternion(worldQuat).multiplyScalar(this.cameraDistance);
      offset.y += 0.55;
      // Pull the camera in when the ship's own timbers are in the way, so it
      // never ends up staring at the inside of a sail.
      let distance = offset.length();
      if (this.ship) {
        const direction = offset.clone().normalize();
        this.raycaster.set(eyeWorld, direction);
        this.raycaster.far = distance;
        this.raycaster.near = 0.05;
        const hits = this.raycaster.intersectObject(this.ship.group, true);
        const blocking = hits.find((hit) => hit.distance > 0.2);
        if (blocking) distance = Math.max(0.35, blocking.distance - 0.3);
      }
      const target = eyeWorld.clone().addScaledVector(offset.normalize(), distance);
      // Never let the third-person camera dip below the sea surface.
      const waterHeight = ctx.ocean.waterHeight(target.x, target.z);
      target.y = Math.max(target.y, waterHeight + 0.55);
      const terrain = ctx.islands.heightAt(target.x, target.z);
      target.y = Math.max(target.y, terrain + 0.55);
      camera.position.lerp(target, 1 - Math.exp(-dt * 18));
      camera.quaternion.copy(worldQuat);
    }

    // Field of view: zoom in with the spyglass.
    const targetFov = this.heldKind === 'spyglass' ? 26 : 68;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = damp(camera.fov, targetFov, 9, dt);
      camera.updateProjectionMatrix();
    }
  }

  /**
   * The held item, animated.
   *
   * Everything used to run off one scalar that dipped the wrist and pitched it
   * back, whatever was in the hand and whatever was being done with it — so a
   * cutlass stroke and a pistol shot were the same motion, and the cutlass in
   * particular just bobbed. A sword stroke is a *sweep*: it winds up across the
   * body, comes through on a diagonal, and follows through past the far side. That
   * is nearly all rotation about the view axis, and it needs to be driven by a
   * phase that runs forwards through the stroke rather than by a value decaying
   * towards zero.
   */
  private updateViewModel(dt: number, speed: number): void {
    if (this.swingPhase > 0) {
      this.swingPhase = Math.max(0, this.swingPhase - dt / SWING_TIME);
    }
    this.viewSwing = damp(this.viewSwing, 0, 9, dt);

    // Walking sway, and a slow drift so the hand is never perfectly still.
    //
    // The height here is not cosmetic. At 68 degrees the frustum is only about
    // 0.30 units tall at this depth, so the old y of -0.36 put the whole hand
    // *below the bottom of the screen* - which is the literal answer to why you
    // could not see the cutlass. It has to sit inside the frame to be a viewmodel
    // at all.
    const sway = Math.sin(this.bobPhase) * 0.014 * Math.min(1, speed / 3);
    const idle = Math.sin(this.idlePhase) * 0.008;
    let x = 0.2 + sway;
    let y = -0.1 + Math.abs(sway) * 1.4 + idle;
    let z = -0.62;
    let rx = -0.12;
    let ry = -0.36 + sway * 2;
    let rz = 0.1;

    if (this.swingStyle === 'slash' && this.swingPhase > 0) {
      // t runs 0 -> 1 across the stroke.
      const t = 1 - this.swingPhase;
      // Wind up hard to the right and back over the shoulder for the first
      // quarter, then sweep down and across to the left, then recover.
      const wind = clamp01(t / 0.28);
      const sweep = clamp01((t - 0.24) / 0.34);
      const ease = sweep * sweep * (3 - 2 * sweep);
      const recover = clamp01((t - 0.6) / 0.4);
      const arc = ease * (1 - recover * 0.85);
      x += wind * 0.3 - arc * 0.72;
      y += wind * 0.24 - arc * 0.34;
      z += wind * 0.16 - arc * 0.24;
      // The blade lies back over the shoulder, then scythes across the view.
      rx += wind * 0.55 - arc * 0.5;
      ry += -wind * 0.7 + arc * 1.5;
      rz += -wind * 0.9 + arc * 2.6;
    } else if (this.swingStyle === 'shot' && this.swingPhase > 0) {
      const t = 1 - this.swingPhase;
      // A flintlock throws its muzzle up and the whole gun back into the palm,
      // then settles. Sharp on the way up, slow on the way down.
      const kick = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.88);
      const settle = kick * kick;
      x += settle * 0.03;
      y += settle * 0.05;
      z += settle * 0.11;
      rx += settle * 0.62;
      rz += settle * 0.16;
    } else {
      // Everything else - digging, patching, bailing - keeps the old thump.
      y -= this.viewSwing * 0.06;
      z += this.viewSwing * 0.16;
      rx -= this.viewSwing * 0.9;
      rz += this.viewSwing * 0.35;
    }

    this.viewHand.position.set(x, y, z);
    this.viewHand.rotation.set(rx, ry, rz);
    this.idlePhase += dt * 1.6;
  }

  playSwing(): void {
    this.avatar.playSwing();
    this.swingTimer = SWING_TIME;
    this.swingPhase = 1;
    this.swingStyle = 'slash';
  }

  /** Muzzle rise and a hard kick back into the palm. */
  playShot(): void {
    this.swingTimer = 0.5;
    this.swingPhase = 1;
    this.swingStyle = 'shot';
  }

  /** Kicks the viewmodel back, for tool strikes. */
  recoil(amount = 0.7): void {
    this.swingStyle = 'thump';
    this.viewSwing = Math.max(this.viewSwing, amount);
  }

  toggleView(): void {
    this.firstPerson = !this.firstPerson;
    this.attachHeld();
  }

  /** Sound/gameplay helper: is the player's head under water? */
  isUnderwater(ctx: PlayerContext): boolean {
    const head = this.worldPosition.y + EYE_HEIGHT;
    return head < ctx.ocean.waterHeight(this.worldPosition.x, this.worldPosition.z);
  }

  /** 0..1 how deep in flood water the player is standing, for audio and slowdown. */
  wadeDepth(): number {
    if (!this.ship) return 0;
    return clamp01(this.ship.holdWaterDepth(this.position.y) / 1.4);
  }


  /** Smooth 0..1 for the vignette when hurt. */
  get healthFraction(): number {
    return clamp01(this.health / this.maxHealth);
  }

  /** Distance the player can reach to interact with the world. */
  get reach(): number {
    return 3.1;
  }


  /** Smoothstep helper exposed for the HUD's low-health pulse. */
  get hurtPulse(): number {
    return 1 - smoothstep(0.15, 0.55, this.healthFraction);
  }
}
