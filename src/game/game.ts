import * as THREE from 'three';
import { AudioEngine } from '../core/audio';
import { Engine } from '../core/engine';
import { setTextureQuality } from '../core/textures';
import { Input } from '../core/input';
import { angleDelta, clamp, clamp01, Rng, TAU } from '../core/math';
import { Environment, WORLD_EXTENT } from '../world/environment';
import { IslandDef, IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { buildOutpost, Outpost, updateOutpostLights } from '../world/outpost';
import { Ship } from '../ship/ship';
import { Projectiles } from '../ship/projectiles';
import { CannonMount, SHIP } from '../ship/shipbuilder';
import { Player } from '../player/player';
import { HOTBAR } from '../player/items';
import { Skeleton } from '../ai/skeleton';
import { SkeletonShip } from '../ai/skeletonship';
import { Hud, MapState, ReadoutRow } from '../ui/hud';
import { Effects } from './effects';
import { Chest, LOOT_TABLE } from './loot';
import { Voyage } from './voyages';
import { Mermaid } from './mermaid';

type GameState = 'title' | 'playing' | 'dead';
type Station = 'none' | 'helm' | 'sails' | 'capstan' | 'cannon';

interface Interaction {
  id: string;
  label: string;
  key: string;
  position: THREE.Vector3;
  range: number;
  /** Vertical tolerance; the default keeps players from reaching through decks. */
  verticalRange?: number;
  /** Hold interactions report progress and run every frame while held. */
  hold?: boolean;
  progress?: () => number;
  activate?: () => void;
  tick?: (dt: number) => void;
}

const KNOTS = 1.94384;

/** The hold volume in ship-local space, used to mask the sea out of interiors. */
/**
 * The volume the sea is cut out of while the camera is below deck. It reaches
 * well above the deck because the ocean mesh knows nothing about the hull: with
 * the ship down in a trough, the crest alongside would otherwise slice straight
 * through the hold at chest height.
 */
const INTERIOR_MIN = new THREE.Vector3(SHIP.stern - 0.4, SHIP.holdFloorY - 1.5, -3.3);
const INTERIOR_MAX = new THREE.Vector3(8.0, SHIP.deckY + 4.0, 3.3);

/**
 * The game: owns every system, runs the fixed-step simulation, resolves what the
 * player can interact with, and keeps the HUD in step with the world.
 */
export class Game {
  readonly engine: Engine;
  readonly env: Environment;
  readonly islands: IslandField;
  readonly ocean: Ocean;
  readonly audio = new AudioEngine();
  readonly input: Input;
  readonly hud = new Hud();
  readonly effects: Effects;
  readonly projectiles: Projectiles;
  readonly player = new Player();
  readonly mermaid: Mermaid;

  playerShip: Ship;
  ships: Ship[] = [];
  fleet: SkeletonShip[] = [];
  skeletons: Skeleton[] = [];
  chests: Chest[] = [];
  outposts: Outpost[] = [];
  voyage: Voyage | null = null;

  gold = 0;
  state: GameState = 'title';
  station: Station = 'none';
  cannon: CannonMount | null = null;

  private rng = new Rng(20240724);
  private interaction: Interaction | null = null;
  private holdTime = 0;
  /** True once an interact keypress has been used this frame. */
  private consumedInteract = false;
  private mapOpen = false;
  private fleetRespawnTimer = 45;
  private shipRespawnTimer = 0;
  private seagullTimer = 8;
  private encounterIsland: IslandDef | null = null;
  private carried: Chest | null = null;
  private hudTimer = 0;
  private sprayTimer = 0;
  /** Camera shake, decaying towards zero. */
  private shake = 0;
  /** Recycled muzzle-flash / explosion light. */
  private flash = new THREE.PointLight(0xffd08a, 0, 40, 2);
  private flashTimer = 0;
  private scratch = new THREE.Vector3();
  private scratchB = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas);
    // Material textures are painted at load time; smaller ones on weak hardware.
    setTextureQuality(this.engine.quality.textureSize);
    this.input = new Input(canvas);
    this.env = new Environment(this.engine.scene);
    // Sky-derived image-based lighting: shaded surfaces and metals need it.
    this.env.attachRenderer(this.engine.renderer);
    this.engine.scene.add(this.flash);
    this.islands = new IslandField();
    this.islands.build();
    this.engine.scene.add(this.islands.group);
    this.ocean = new Ocean(this.env, this.islands, this.engine.scene, this.engine.quality.oceanSegments);
    this.effects = new Effects(this.engine.scene, this.engine.quality.particles ? 700 : 260);
    this.projectiles = new Projectiles(this.engine.scene);
    this.mermaid = new Mermaid(this.engine.scene);

    for (const island of this.islands.islands) {
      if (island.kind === 'outpost') this.outposts.push(buildOutpost(island, this.islands, this.engine.scene));
    }

    this.playerShip = new Ship({ name: 'The Salty Regret', waveUniforms: this.env.uniforms as unknown as Record<string, THREE.IUniform> });
    this.engine.scene.add(this.playerShip.group);
    this.ships.push(this.playerShip);

    const startOutpost = this.outposts[0];
    const berth = startOutpost.mooring;
    // Moor facing back down the pier, as if we had just tied up.
    const heading = Math.atan2(startOutpost.dockEnd.z - berth.z, startOutpost.dockEnd.x - berth.x);
    this.playerShip.place(berth.x, berth.z, heading + Math.PI / 2);
    this.playerShip.onCreak = () => this.audio.creak();
    this.playerShip.onImpact = (point, strength) => {
      this.audio.woodImpact(point.distanceTo(this.engine.camera.position));
      this.effects.burst('debris', point, Math.round(6 + strength * 12), { speed: 5 });
      this.effects.burst('smoke', point, Math.round(4 + strength * 8), { speed: 2.6, scale: 1.3 });
      this.flashLight(point, 0xffc178, 14 * strength, 0.07);
      this.addShake(0.5 + strength * 0.9);
      this.hud.hurtFlash(strength * 0.3);
    };

    this.engine.scene.add(this.player.group);
    this.player.boardShip(this.playerShip, this.playerShip.model.anchors.spawn.position.clone());
    this.player.onFootstep = (onWood, running) => this.audio.footstep(onWood, running);
    this.player.onSplash = (strength) => this.audio.splash(0, 0.6 + strength);
    this.player.onHurt = () => {
      this.audio.hurt();
      this.hud.hurtFlash(0.7);
    };
    this.engine.camera.add(this.player.viewModelGroup);
    this.engine.scene.add(this.engine.camera);

    this.env.onThunder = (closeness) => this.audio.thunder(closeness);

    for (let i = 0; i < 2; i++) this.spawnFleetShip();

    this.engine.onFixedUpdate = (dt) => this.fixedUpdate(dt);
    this.engine.onRender = (dt) => this.render(dt);

    this.bindUi();
  }

  private bindUi(): void {
    const play = document.getElementById('btn-play');
    play?.addEventListener('click', () => this.begin());
    document.getElementById('btn-respawn')?.addEventListener('click', () => this.respawnPlayer());
    this.input.onPointerLockChange((locked) => {
      if (!locked && this.state === 'playing' && !this.mapOpen) this.hud.setPrompt('Click to resume', 'LMB');
    });
    document.getElementById('viewport')?.addEventListener('click', () => {
      if (this.state === 'playing' && !this.mapOpen) this.input.requestPointerLock();
    });
  }

  start(): void {
    this.hud.setLoading(false);
    this.hud.showTitle(true);
    this.engine.start();
  }

  /**
   * Test/debug seam: advances the simulation without rendering, so the headless
   * smoke test can play through the game far faster than real time.
   */
  stepSimulation(dt = 1 / 60, steps = 1): void {
    for (let i = 0; i < steps; i++) this.fixedUpdate(dt);
  }

  /** Id of whatever the player could interact with right now, for tests and debugging. */
  get currentInteractionId(): string | null {
    return this.interaction?.id ?? null;
  }

  get carriedChest(): Chest | null {
    return this.carried;
  }

  /** Drops the player onto their ship at a ship-local position, facing `yaw`. */
  placePlayerOnShip(local: THREE.Vector3, yaw?: number): void {
    this.station = 'none';
    this.cannon = null;
    this.player.stationLock = null;
    this.player.ship = this.playerShip;
    this.player.mode = 'ship';
    this.player.position.copy(local);
    this.player.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.player.yaw = yaw;
  }

  /** Drops the player into the world (land or sea) at a world position. */
  placePlayerInWorld(world: THREE.Vector3, yaw?: number): void {
    this.station = 'none';
    this.cannon = null;
    this.player.stationLock = null;
    this.player.ship = null;
    this.player.position.copy(world);
    this.player.velocity.set(0, 0, 0);
    const surface = this.ocean.waterHeight(world.x, world.z);
    this.player.mode = world.y + 0.9 < surface ? 'swim' : 'land';
    if (yaw !== undefined) this.player.yaw = yaw;
  }

  /** Faces the player at a world position (used by tests to look at interactables). */
  facePlayerAt(target: THREE.Vector3): void {
    const from = this.player.isAboard && this.player.ship
      ? this.player.ship.worldToLocal(target.clone())
      : target.clone();
    const dx = from.x - this.player.position.x;
    const dz = from.z - this.player.position.z;
    // Inverse of lookForward = (-sin(yaw), 0, -cos(yaw)).
    this.player.yaw = Math.atan2(-dx, -dz);
    this.player.pitch = 0;
  }

  begin(): void {
    this.audio.start();
    this.audio.resume();
    this.audio.scheduleShanty(14);
    this.state = 'playing';
    this.hud.showTitle(false);
    this.hud.setVisible(true);
    this.input.requestPointerLock();
    this.hud.toast('Weigh anchor at the capstan, then raise the sails', 'info');
    this.acceptVoyage(true);
  }

  // ------------------------------------------------------------- simulation

  private fixedUpdate(dt: number): void {
    // The world simulation lives here so physics never depends on frame rate.
    this.consumedInteract = false;
    this.env.update(dt, this.player.worldPos);

    if (this.state === 'title') {
      this.orbitTitleCamera(dt);
      return;
    }

    this.handleGlobalKeys();

    if (this.state === 'playing' && !this.mapOpen) {
      this.player.handleLook(this.input);
      this.updateStation(dt);
      this.updateToolUse(dt);
    }

    this.player.update(dt, this.input, { ships: this.ships, ocean: this.ocean, islands: this.islands, env: this.env });

    this.playerShip.update(dt, this.env, this.ocean, this.islands);
    for (const enemy of this.fleet) {
      enemy.update(dt, {
        env: this.env,
        ocean: this.ocean,
        islands: this.islands,
        target: this.playerShip.destroyed ? null : this.playerShip,
        projectiles: this.projectiles,
        onCannonFire: (position) => {
          this.audio.cannonFire(position.distanceTo(this.engine.camera.position));
          this.effects.burst('smoke', position, 12, { speed: 3.4 });
          this.effects.burst('spark', position, 6, { speed: 6 });
        },
      });
    }

    this.updateProjectiles(dt);
    this.updateSkeletons(dt);
    this.updateChests(dt);
    this.updateVoyage();
    this.updateEncounters(dt);
    this.updateFleetLifecycle(dt);
    this.updatePlayerShipLifecycle(dt);
    this.updateMermaid(dt);
    this.resolveInteractions(dt);
    this.updateAmbience(dt);

    this.input.endFrame();
  }

  private render(dt: number): void {
    const camera = this.engine.camera;
    this.env.focusShadows(this.player.worldPos);

    if (this.state === 'title') {
      this.engine.setBloomStrength(0.5);
    } else {
      this.player.updateCamera(camera, { ships: this.ships, ocean: this.ocean, islands: this.islands, env: this.env }, dt);
    }

    const wakeSources = [this.playerShip, ...this.fleet.map((f) => f.ship)]
      .filter((ship) => !ship.destroyed)
      .map((ship) => ship.wakeSource());
    this.updateShake(dt);
    this.updateInteriorMask(camera.position);
    this.ocean.update(dt, camera.position, wakeSources);
    this.updateSpray(dt);
    this.effects.update(dt);
    updateOutpostLights(this.outposts, this.env.nightFactor, this.env.localStorm);

    this.hud.update(dt);
    this.hudTimer += dt;
    if (this.state !== 'title' && this.hudTimer > 0.08) {
      this.hudTimer = 0;
      this.updateHud();
    }
  }

  /**
   * The hold is below the waterline, so while the camera is down there the sea
   * has to be cut out of that hull's interior volume.
   */
  private updateShake(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 3.4);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.flashTimer <= 0 && this.flash.intensity > 0) this.flash.intensity = 0;
    else if (this.flashTimer > 0) this.flash.intensity *= 0.82;
    this.engine.setGrade({ shake: this.shake * this.shake, time: this.engine.elapsed });
  }

  private updateInteriorMask(cameraPosition: THREE.Vector3): void {
    for (const ship of this.ships) {
      if (ship.destroyed) continue;
      if (ship.distanceTo(cameraPosition) > 24) continue;
      const local = ship.worldToLocal(cameraPosition.clone(), this.scratchB);
      // Only when the camera is genuinely below the deck: the mask must not
      // kick in while standing on deck, or the sea would vanish around the hull.
      if (
        local.x > INTERIOR_MIN.x &&
        local.x < INTERIOR_MAX.x &&
        local.y > INTERIOR_MIN.y &&
        local.y < SHIP.deckY - 0.15 &&
        Math.abs(local.z) < 2.6
      ) {
        this.ocean.setInteriorMask(ship.group.matrixWorld, INTERIOR_MIN, INTERIOR_MAX);
        return;
      }
    }
    this.ocean.setInteriorMask(null);
  }

  /** Bow spray and hull foam for ships under way, plus surf where the bow digs in. */
  private updateSpray(dt: number): void {
    if (!this.engine.quality.particles) return;
    this.sprayTimer -= dt;
    if (this.sprayTimer > 0) return;
    this.sprayTimer = 0.09;

    for (const ship of this.ships) {
      if (ship.destroyed || ship.speed < 2.2) continue;
      if (ship.distanceTo(this.engine.camera.position) > 220) continue;

      const bow = ship.localToWorld(this.scratch.set(SHIP.bow - 1.6, -0.35, 0).clone());
      const surface = this.ocean.waterHeight(bow.x, bow.z);
      bow.y = surface + 0.1;
      const strength = clamp01((ship.speed - 2) / 5);
      const outward = ship.forward.multiplyScalar(0.6).add(new THREE.Vector3(0, 1.1, 0));
      this.effects.burst('splash', bow, 2 + Math.round(strength * 3), {
        speed: 2.2 + strength * 3.4,
        direction: outward,
        spread: 0.85,
        scale: 0.9 + strength * 0.6,
      });

      // A little foam peeling off the quarters, where the wake is born.
      if (ship.speed > 4) {
        for (const side of [-1, 1] as const) {
          const quarter = ship.localToWorld(this.scratch.set(-5.5, -0.2, side * 2.9).clone());
          quarter.y = this.ocean.waterHeight(quarter.x, quarter.z) + 0.05;
          this.effects.burst('splash', quarter, 1, { speed: 1.4, scale: 0.8, spread: 1 });
        }
      }
    }
  }

  private orbitTitleCamera(dt: number): void {
    // Slow drift past the moored sloop while the title screen is up.
    const t = this.env.uniforms.uTime.value * 0.06;
    const ship = this.playerShip;
    ship.update(dt, this.env, this.ocean, this.islands);
    const radius = 26;
    const camera = this.engine.camera;
    camera.position.set(
      ship.position.x + Math.cos(t) * radius,
      6.5 + Math.sin(t * 0.7) * 1.2,
      ship.position.z + Math.sin(t) * radius,
    );
    camera.lookAt(ship.position.x, 4.2, ship.position.z);
  }

  // ----------------------------------------------------------------- input

  private handleGlobalKeys(): void {
    if (this.input.wasPressed('KeyM') || (this.mapOpen && this.input.wasPressed('Escape'))) {
      this.toggleMap();
    }
    if (this.mapOpen) return;

    if (this.input.wasPressed('KeyV')) this.player.toggleView();
    if (this.input.wasPressed('KeyF')) {
      this.player.lanternOn = !this.player.lanternOn;
      this.audio.uiClick();
    }
    for (let i = 0; i < HOTBAR.length; i++) {
      if (this.input.wasPressed(`Digit${i + 1}`)) {
        this.player.equip(i);
        this.audio.uiClick();
      }
    }
    if (this.input.wheelDelta !== 0) {
      this.player.equip((this.player.slot + this.input.wheelDelta + HOTBAR.length) % HOTBAR.length);
    }
    if (this.state === 'dead' && this.input.wasPressed('Enter')) this.respawnPlayer();
  }

  private toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    this.hud.toggleMap(this.mapOpen);
    this.audio.uiClick();
    if (this.mapOpen) {
      this.input.exitPointerLock();
      this.hud.drawMap(this.buildMapState());
    } else if (this.state === 'playing') {
      this.input.requestPointerLock();
    }
  }

  private buildMapState(): MapState {
    return {
      extent: WORLD_EXTENT,
      islands: this.islands.islands.map((i) => ({ name: i.name, x: i.x, z: i.z, radius: i.radius, kind: i.kind })),
      ship: { x: this.playerShip.position.x, z: this.playerShip.position.z, heading: this.playerShip.heading },
      player: { x: this.player.worldPos.x, z: this.player.worldPos.z },
      marks:
        this.voyage && !this.voyage.complete
          ? this.voyage.sites
              .filter((s) => !s.dug)
              .map((s) => ({ x: s.position.x, z: s.position.z, label: '' }))
          : [],
      storm: this.env.storm.active
        ? { x: this.env.storm.center.x, z: this.env.storm.center.y, radius: this.env.storm.radius }
        : null,
      enemies: this.fleet
        .filter((f) => !f.ship.destroyed && f.ship.distanceTo(this.playerShip.position) < 700)
        .map((f) => ({ x: f.ship.position.x, z: f.ship.position.z })),
    };
  }

  // --------------------------------------------------------------- stations

  private updateStation(dt: number): void {
    const ship = this.playerShip;

    if (this.station !== 'none' && (this.input.wasPressed('KeyE') || ship.destroyed)) {
      // Mark the key as spent so stepping away does not immediately re-enter.
      this.consumedInteract = true;
      this.leaveStation();
      return;
    }

    switch (this.station) {
      case 'helm': {
        ship.helmInput = this.input.axis('KeyA', 'KeyD');
        // Feeds the avatar's arms so your hands ride the spokes as they turn.
        this.player.stationParam = clamp(ship.rudder, -1, 1);
        break;
      }
      case 'sails': {
        const raise = this.input.axis('KeyS', 'KeyW');
        if (raise !== 0) ship.adjustSail(raise * dt * 0.6);
        const trim = this.input.axis('KeyA', 'KeyD');
        if (trim !== 0) ship.adjustTrim(trim * dt * 0.85);
        break;
      }
      case 'capstan': {
        if (ship.turnCapstan(dt)) {
          this.hud.toast('Anchor away!', 'info');
          this.leaveStation();
        }
        break;
      }
      case 'cannon': {
        this.updateCannonAim(dt);
        break;
      }
      default:
        break;
    }
  }

  private enterStation(station: Station, cannon?: CannonMount): void {
    this.station = station;
    this.cannon = cannon ?? null;
    this.audio.uiClick();

    switch (station) {
      case 'helm':
        // Stand aft of the wheel looking forward over it, so you can watch the
        // spokes turn as you steer and see where the bow is pointing.
        this.player.stationLock = new THREE.Vector3(-8.15, SHIP.upperDeckY, 0);
        this.player.yaw = -Math.PI / 2;
        this.player.pitch = -0.1;
        this.player.stationPose = 'helm';
        break;
      case 'sails':
        this.player.stationLock = new THREE.Vector3(SHIP.mastX, SHIP.deckY, 1.5);
        break;
      case 'capstan':
        this.player.stationLock = new THREE.Vector3(4.2, SHIP.deckY, 0);
        this.player.stationPose = 'crank';
        break;
      case 'cannon':
        if (cannon) {
          // Stand behind the breech, crouched to the gun, looking out over it.
          this.player.stationLock = cannon.stand.clone();
          this.player.eyeOffset = -0.55;
          this.player.yaw = cannon.side > 0 ? Math.PI : 0;
          this.player.pitch = 0.04;
        }
        break;
      default:
        this.player.stationLock = null;
    }
  }

  private leaveStation(): void {
    if (this.station === 'capstan' && this.playerShip.anchorRaise < 1) this.playerShip.dropAnchor();
    this.station = 'none';
    this.cannon = null;
    this.player.stationLock = null;
    this.player.eyeOffset = 0;
    this.player.stationPose = null;
    this.player.stationParam = 0;
    this.audio.uiClick();
  }

  /**
   * A short-lived point light, for muzzle flashes and explosions. One light is
   * recycled: two guns firing within a tenth of a second is not worth a second
   * shadow-less light in the scene.
   */
  private flashLight(position: THREE.Vector3, color: number, intensity: number, duration: number): void {
    this.flash.position.copy(position);
    this.flash.color.setHex(color);
    this.flash.intensity = intensity;
    this.flashTimer = duration;
  }

  /** Adds to the camera shake, which decays every frame. */
  addShake(amount: number): void {
    this.shake = Math.min(1.4, this.shake + amount);
  }

  private updateCannonAim(dt: number): void {
    const cannon = this.cannon;
    if (!cannon) return;

    // The gun follows the player's view, within the arc the carriage allows.
    const restBearing = cannon.side > 0 ? 0 : Math.PI;
    const desired = angleDelta(restBearing, -this.player.yaw + Math.PI / 2);
    const yawOffset = clamp(desired, -0.85, 0.85);
    cannon.pivot.rotation.y = restBearing + yawOffset;
    cannon.elevation.rotation.x = clamp(-this.player.pitch, -0.62, 0.22);

    if (this.input.wasMousePressed(0)) this.fireCannon(cannon);
    void dt;
  }

  private fireCannon(cannon: CannonMount): void {
    if (this.player.count('cannonballs') <= 0) {
      this.hud.toast('Out of cannonballs - restock below deck', 'bad');
      return;
    }
    this.player.consume('cannonballs');

    const muzzle = cannon.muzzle.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(cannon.muzzle.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    this.projectiles.fire({
      kind: 'cannonball',
      position: muzzle,
      velocity: direction.clone().multiplyScalar(Projectiles.cannonMuzzleSpeed()).add(this.playerShip.velocity),
      source: this.playerShip,
      friendly: true,
      power: 1,
    });

    this.audio.cannonFire(0);
    // A gun going off: a bright flash at the muzzle, a jet of smoke ahead of it,
    // a slower cloud rolling back over the deck, sparks, and a kick you feel.
    this.flashLight(muzzle, 0xffd08a, 26, 0.09);
    this.effects.burst('smoke', muzzle, 22, { speed: 6.5, direction, spread: 0.35, scale: 1.4 });
    this.effects.burst('smoke', muzzle.clone().addScaledVector(direction, -0.4), 10, {
      speed: 1.6,
      spread: 1.2,
      scale: 1.8,
    });
    this.effects.burst('spark', muzzle, 12, { speed: 11, direction, spread: 0.3 });
    this.addShake(0.85);
    this.hud.hurtFlash(0.06);
  }

  // ------------------------------------------------------------- tool usage

  private updateToolUse(dt: number): void {
    if (this.station !== 'none' || this.player.dead) return;
    const held = this.player.held;
    const firing = this.input.wasMousePressed(0);

    if (held === 'cutlass' && firing) this.swingCutlass();
    if (held === 'flintlock' && firing) this.fireFlintlock();
    if (held === 'banana' && firing) this.eatBanana();

    // Bailing works while standing in the flood water with a bucket.
    if (held === 'bucket' && this.input.isMouseDown(0) && this.player.isAboard) {
      const depth = this.player.wadeDepth();
      if (depth > 0.08) {
        const removed = this.playerShip.bail(9 * dt);
        if (removed > 0 && Math.random() < dt * 3) this.audio.splash(0, 0.5);
      }
    }
    void dt;
  }

  private swingCutlass(): void {
    this.player.playSwing();
    this.audio.swordSwing();

    const origin = this.player.eyeWorld.clone();
    const direction = this.player.worldLookDirection(this.scratch).clone();
    let hitSomething = false;

    for (const skeleton of this.skeletons) {
      if (!skeleton.alive) continue;
      const toTarget = this.scratchB.copy(skeleton.position).setY(skeleton.position.y + 0.9).sub(origin);
      const distance = toTarget.length();
      if (distance > 2.9) continue;
      if (toTarget.normalize().dot(direction) < 0.45) continue;
      skeleton.hit(38, origin, this.skeletonContext());
      this.effects.burst('bone', skeleton.position.clone().setY(skeleton.position.y + 1), 10, { speed: 3.5 });
      this.audio.swordHit(true);
      hitSomething = true;
    }

    if (!hitSomething) this.audio.swordHit(false);
  }

  private fireFlintlock(): void {
    if (!this.player.consume('shots')) {
      this.hud.toast('No powder left - restock below deck', 'bad');
      return;
    }
    const origin = this.player.eyeWorld.clone();
    const direction = this.player.worldLookDirection(this.scratch).clone();
    this.projectiles.fire({
      kind: 'bullet',
      position: origin.addScaledVector(direction, 0.6),
      velocity: direction.clone().multiplyScalar(120),
      friendly: true,
      source: this.player.isAboard ? this.playerShip : null,
      power: 1,
    });
    this.audio.pistolShot();
    this.player.recoil(1);
    this.effects.burst('smoke', origin, 8, { speed: 2.4, direction, spread: 0.5 });
  }

  private eatBanana(): void {
    if (this.player.health >= this.player.maxHealth) {
      this.hud.toast('Ye are hale enough', 'info');
      return;
    }
    if (!this.player.consume('banana')) {
      this.hud.toast('No bananas left', 'bad');
      return;
    }
    this.player.heal(42);
    this.hud.toast('That hit the spot', 'info');
  }

  // ---------------------------------------------------------- interactions

  private resolveInteractions(dt: number): void {
    if (this.mapOpen || this.player.dead) {
      this.interaction = null;
      return;
    }

    const candidates = this.collectInteractions();
    const eye = this.player.eyeWorld.clone();
    const feet = this.player.worldPos;
    const look = this.player.worldLookDirection(this.scratch).clone();

    let best: Interaction | null = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      // Range is measured from the body, so kneeling next to a capstan still
      // counts, while facing is judged from the eye.
      const flat = Math.hypot(candidate.position.x - feet.x, candidate.position.z - feet.z);
      const vertical = Math.abs(candidate.position.y - feet.y);
      // The vertical limit keeps players from reaching through a deck into the hold.
      if (flat > candidate.range || vertical > (candidate.verticalRange ?? 1.3)) continue;
      const toTarget = this.scratchB.copy(candidate.position).sub(eye);
      const distance = toTarget.length();
      const facing = toTarget.normalize().dot(look);
      // Only require line of sight for things further than arm's reach.
      if (facing < 0.2 && flat > 2) continue;
      // Prefer things we are looking straight at, then things that are close.
      const score = facing * 2 + (1 - flat / candidate.range) + (distance < 2 ? 0.4 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) {
      this.interaction = null;
      this.holdTime = 0;
      this.hud.setPrompt(null);
      return;
    }

    if (this.interaction?.id !== best.id) this.holdTime = 0;
    this.interaction = best;

    if (best.hold) {
      if (this.input.isDown('KeyE')) {
        this.holdTime += dt;
        best.tick?.(dt);
      } else {
        this.holdTime = 0;
      }
      this.hud.setPrompt(best.label, best.key, best.progress ? best.progress() : clamp01(this.holdTime));
    } else {
      this.hud.setPrompt(best.label, best.key);
      if (this.input.wasPressed('KeyE') && !this.consumedInteract) {
        this.consumedInteract = true;
        best.activate?.();
      }
    }
  }

  private collectInteractions(): Interaction[] {
    const list: Interaction[] = [];
    const ship = this.playerShip;
    const aboard = this.player.isAboard && this.player.ship === ship;

    if (this.carried) {
      list.push({
        id: 'drop-chest',
        label: `Set down the ${this.carried.def.name}`,
        key: 'E',
        position: this.player.eyeWorld.clone(),
        range: 4,
        activate: () => this.dropCarried(),
      });
    }

    if (aboard && this.station === 'none' && !ship.destroyed) {
      const anchors = ship.model.anchors;
      list.push({
        id: 'helm',
        label: 'Take the helm',
        key: 'E',
        position: anchors.helm.getWorldPosition(new THREE.Vector3()),
        range: 3.2,
        activate: () => this.enterStation('helm'),
      });
      list.push({
        id: 'sails',
        label: ship.sailAmount > 0.5 ? 'Work the sails' : 'Raise the sails',
        key: 'E',
        position: anchors.sails.getWorldPosition(new THREE.Vector3()),
        range: 3.4,
        activate: () => this.enterStation('sails'),
      });
      list.push(
        ship.anchorRaise >= 1
          ? {
              id: 'anchor-drop',
              label: 'Drop anchor',
              key: 'E',
              position: anchors.capstan.getWorldPosition(new THREE.Vector3()),
              range: 3,
              activate: () => {
                ship.dropAnchor();
                this.hud.toast('Anchor dropped', 'info');
              },
            }
          : {
              id: 'anchor-raise',
              label: 'Raise the anchor',
              key: 'E',
              position: anchors.capstan.getWorldPosition(new THREE.Vector3()),
              range: 3,
              activate: () => this.enterStation('capstan'),
            },
      );

      for (const cannon of ship.model.cannons) {
        list.push({
          id: `cannon-${cannon.index}`,
          label: 'Man the cannon',
          key: 'E',
          position: anchors[`cannon-${cannon.index}`].getWorldPosition(new THREE.Vector3()),
          range: 2.6,
          activate: () => this.enterStation('cannon', cannon),
        });
      }

      const supplies: { name: string; item: string; amount: number; label: string }[] = [
        { name: 'cannonballs', item: 'cannonballs', amount: 6, label: 'Take cannonballs' },
        { name: 'planks', item: 'planks', amount: 4, label: 'Take planks' },
        { name: 'bananas', item: 'banana', amount: 2, label: 'Take bananas' },
      ];
      for (const supply of supplies) {
        const anchor = anchors[`barrel-${supply.name}`];
        if (!anchor) continue;
        list.push({
          id: `supply-${supply.name}`,
          label: supply.label,
          key: 'E',
          position: anchor.getWorldPosition(new THREE.Vector3()),
          range: 2.4,
          activate: () => {
            this.player.give(supply.item, supply.amount, supply.item === 'cannonballs' ? 40 : 12);
            if (supply.item === 'cannonballs') this.player.give('shots', 3, 6);
            this.audio.uiClick();
            this.hud.toast(`${supply.label.replace('Take', 'Took')}`, 'info');
          },
        });
      }

      list.push({
        id: 'maptable',
        label: 'Study the chart',
        key: 'E',
        position: anchors.maptable.getWorldPosition(new THREE.Vector3()),
        range: 2.8,
        activate: () => this.toggleMap(),
      });

      // Repairing a breach with planks.
      if (this.player.held === 'planks' && this.player.count('planks') > 0) {
        const hole = ship.findHole(this.player.position, 3);
        if (hole) {
          list.push({
            id: 'repair',
            label: 'Patch the hull',
            key: 'E',
            position: ship.localToWorld(hole.local.clone()),
            range: 3,
            hold: true,
            progress: () => hole.repairProgress,
            tick: (dt) => {
              if (ship.repairHole(hole, dt)) {
                this.player.consume('planks');
                this.audio.woodImpact(0);
                this.hud.toast('Hull patched', 'info');
              } else if (Math.random() < dt * 6) {
                this.player.recoil(0.45);
                this.audio.footstep(true, false);
              }
            },
          });
        }
      }
    }

    if (this.mermaid.active) {
      list.push({
        id: 'mermaid',
        label: "Take the mermaid's hand",
        key: 'E',
        position: this.mermaid.position.clone().setY(this.mermaid.position.y + 0.6),
        range: 3.6,
        // Swimmers float low in the water, so allow a taller reach here.
        verticalRange: 2.8,
        activate: () => this.rideMermaid(),
      });
    }

    // Loose treasure lying about.
    if (!this.carried) {
      for (const chest of this.chests) {
        if (chest.sold) continue;
        const position = chest.worldPosition;
        if (position.distanceTo(this.player.worldPos) > 4) continue;
        list.push({
          id: `chest-${chest.def.kind}-${this.chests.indexOf(chest)}`,
          label: `Lift the ${chest.def.name}`,
          key: 'E',
          position,
          range: 3.2,
          activate: () => this.carryChest(chest),
        });
      }
    }

    // Outpost services.
    for (const outpost of this.outposts) {
      if (outpost.sell.distanceTo(this.player.worldPos) < 6) {
        const sellable = this.carried ?? this.nearbyChest(outpost.sell, 6);
        if (sellable) {
          list.push({
            id: 'sell',
            label: `Sell the ${sellable.def.name} (${sellable.def.value} gold)`,
            key: 'E',
            position: outpost.sell,
            range: 5,
            activate: () => this.sellChest(sellable),
          });
        } else {
          list.push({
            id: 'sell-empty',
            label: 'The Gold Hoarders await your treasure',
            key: 'E',
            position: outpost.sell,
            range: 5,
            activate: () => this.hud.toast('Bring them a chest and they will pay', 'info'),
          });
        }
      }

      if (outpost.voyage.distanceTo(this.player.worldPos) < 6) {
        list.push({
          id: 'voyage',
          label: this.voyage && !this.voyage.complete ? 'Trade for a new voyage' : 'Take a voyage',
          key: 'E',
          position: outpost.voyage,
          range: 5,
          activate: () => this.acceptVoyage(false),
        });
      }

      if (outpost.resupply.distanceTo(this.player.worldPos) < 6) {
        list.push({
          id: 'resupply',
          label: 'Restock supplies',
          key: 'E',
          position: outpost.resupply,
          range: 5,
          activate: () => {
            this.player.give('planks', 5, 12);
            this.player.give('banana', 4, 12);
            this.player.give('cannonballs', 12, 40);
            this.player.give('shots', 5, 6);
            this.audio.uiClick();
            this.hud.toast('Supplies restocked', 'info');
          },
        });
      }
    }

    // Digging.
    if (this.voyage && this.player.held === 'shovel' && !this.player.isAboard) {
      const site = this.voyage.siteNear(this.player.worldPos, 3.2);
      if (site) {
        list.push({
          id: 'dig',
          label: 'Dig',
          key: 'E',
          position: site.position,
          range: 3.4,
          hold: true,
          progress: () => site.digProgress,
          tick: (dt) => {
            site.digProgress += dt / 2.6;
            if (Math.random() < dt * 5) {
              this.player.recoil(0.5);
              this.audio.dig();
              this.effects.burst('sand', site.position.clone().setY(site.position.y + 0.2), 6, { speed: 2.6 });
            }
            if (site.digProgress >= 1) {
              site.dug = true;
              site.marker.visible = false;
              this.voyage!.recovered++;
              const chest = new Chest(site.loot, site.position.clone().setY(site.position.y + 0.4), this.engine.scene);
              this.chests.push(chest);
              this.audio.chestOpen();
              this.effects.burst('sand', site.position, 26, { speed: 4.5 });
              this.hud.toast(`Unearthed a ${site.loot.name}!`, 'gold');
            }
          },
        });
      }
    }

    return list;
  }

  /** The mermaid returns the player (and any loot they are hauling) to the ship. */
  private rideMermaid(): void {
    if (this.playerShip.destroyed) {
      const outpost = this.nearestOutpost(this.player.worldPos);
      this.playerShip.respawn(outpost.dockEnd.x + 16, outpost.dockEnd.z + 10, 0);
    }
    // She carries you home, but she does not heal you.
    const health = this.player.health;
    this.player.respawnOn(this.playerShip);
    this.player.health = Math.max(20, health);
    if (this.carried) {
      this.carried.drop(this.playerShip.localToWorld(new THREE.Vector3(3, SHIP.holdFloorY + 0.3, 0)), this.ships);
      this.carried = null;
      this.player.carrying = null;
    }
    this.mermaid.dismiss();
    this.audio.bell();
    this.hud.toast('The mermaid returns ye to yer ship', 'info');
  }

  private nearbyChest(position: THREE.Vector3, range: number): Chest | null {
    for (const chest of this.chests) {
      if (chest.sold) continue;
      if (chest.worldPosition.distanceTo(position) < range) return chest;
    }
    return null;
  }

  private carryChest(chest: Chest): void {
    if (this.carried) return;
    chest.pickUp();
    this.carried = chest;
    this.player.carrying = chest.mesh;
    this.audio.uiClick();
  }

  private dropCarried(): void {
    const chest = this.carried;
    if (!chest) return;
    const drop = this.player.worldPos
      .clone()
      .addScaledVector(this.player.worldLookDirection(this.scratch).setY(0).normalize(), 1.1);
    drop.y = this.player.worldPos.y + 0.2;
    chest.drop(drop, this.ships);
    this.carried = null;
    this.player.carrying = null;
    this.audio.woodImpact(0);
  }

  private sellChest(chest: Chest): void {
    if (chest.sold) return;
    chest.sold = true;
    this.gold += chest.def.value;
    if (this.carried === chest) {
      this.carried = null;
      this.player.carrying = null;
    }
    chest.dispose();
    this.chests = this.chests.filter((c) => c !== chest);
    this.audio.coins();
    this.hud.toast(`+${chest.def.value} gold for the ${chest.def.name}`, 'gold');
    if (this.voyage) {
      this.voyage.sold++;
      if (this.voyage.complete && this.voyage.sold >= this.voyage.recovered) {
        this.hud.toast('Voyage complete - take another from the tent', 'gold');
      }
    }
  }

  private acceptVoyage(silent: boolean): void {
    this.voyage?.dispose();
    this.voyage = Voyage.generate(this.islands, this.engine.scene, this.rng);
    this.encounterIsland = this.voyage.island;
    this.despawnSkeletons();
    if (!silent) this.audio.uiClick();
    this.hud.toast(`New voyage: ${this.voyage.title} - ${this.voyage.island.name}`, 'gold');
  }

  // ---------------------------------------------------------------- systems

  private skeletonContext() {
    return {
      islands: this.islands,
      playerPosition: this.player.worldPos,
      playerAlive: !this.player.dead,
      onAttack: (damage: number) => {
        this.player.damage(damage, 'Cut down by a skeleton.');
        this.audio.swordHit(false);
      },
      onRattle: (position: THREE.Vector3) => {
        this.audio.skeletonRattle(position.distanceTo(this.engine.camera.position));
      },
      onDeath: (skeleton: Skeleton) => {
        this.effects.burst('bone', skeleton.position.clone().setY(skeleton.position.y + 0.9), 26, { speed: 5 });
        this.audio.skeletonRattle(skeleton.position.distanceTo(this.engine.camera.position));
        this.gold += 25;
        this.hud.toast('+25 gold from the bones', 'gold');
      },
    };
  }

  private updateSkeletons(dt: number): void {
    const ctx = this.skeletonContext();
    for (const skeleton of this.skeletons) skeleton.update(dt, ctx);
    const expired = this.skeletons.filter((s) => s.expired);
    for (const skeleton of expired) skeleton.dispose();
    if (expired.length > 0) this.skeletons = this.skeletons.filter((s) => !s.expired);
  }

  private updateProjectiles(dt: number): void {
    this.projectiles.update(dt, {
      ships: this.ships,
      ocean: this.ocean,
      islands: this.islands,
      effects: this.effects,
      targets: [
        ...this.skeletons
          .filter((s) => s.alive)
          .map((skeleton) => ({
            position: skeleton.position,
            radius: skeleton.radius,
            height: skeleton.height,
            friendly: false,
            hit: (damage: number, point: THREE.Vector3) => skeleton.hit(damage, point, this.skeletonContext()),
          })),
        {
          position: this.player.worldPos,
          radius: 0.5,
          height: 1.8,
          friendly: true,
          hit: (damage: number) => this.player.damage(damage, 'Struck by shot.'),
        },
      ],
      onShipHit: (ship, point, power, friendly) => {
        ship.takeCannonHit(point, power);
        if (ship === this.playerShip) {
          this.hud.hurtFlash(0.4);
          this.hud.toast('The hull is breached!', 'bad');
        } else if (friendly) {
          this.hud.toast('A hit!', 'info');
        }
      },
      onSound: (kind, point) => {
        const distance = point.distanceTo(this.engine.camera.position);
        if (kind === 'splash') this.audio.splash(distance, 1.4);
        else if (kind === 'wood') this.audio.woodImpact(distance);
        else this.audio.splash(distance, 0.7);
      },
    });
  }

  private updateChests(dt: number): void {
    const carrier = this.carried
      ? this.player.worldPos
          .clone()
          .add(new THREE.Vector3(0, 0.85, 0))
          .addScaledVector(this.player.worldLookDirection(this.scratch).setY(0).normalize(), 0.75)
      : undefined;
    for (const chest of this.chests) {
      chest.update(dt, {
        ocean: this.ocean,
        islands: this.islands,
        carrier: this.carried === chest ? carrier : undefined,
        carrierYaw: this.player.yaw,
      });
    }
  }

  private updateVoyage(): void {
    if (!this.voyage) return;
    this.voyage.updateMarkers(this.player.worldPos);
  }

  /** Spawns and clears island guardians as the player nears the voyage island. */
  private updateEncounters(dt: number): void {
    const island = this.encounterIsland;
    if (!island) return;
    const distance = Math.hypot(this.player.worldPos.x - island.x, this.player.worldPos.z - island.z);

    if (distance < island.radius + 60 && this.skeletons.length === 0 && this.voyage && !this.voyage.complete) {
      const count = 2 + Math.round(this.voyage.difficulty * 3);
      for (let i = 0; i < count; i++) {
        const site = this.voyage.sites[i % this.voyage.sites.length];
        const angle = this.rng.float(0, TAU);
        const radius = this.rng.float(4, 16);
        const spot = new THREE.Vector3(
          site.position.x + Math.cos(angle) * radius,
          0,
          site.position.z + Math.sin(angle) * radius,
        );
        spot.y = this.islands.heightAt(spot.x, spot.z);
        if (spot.y < 1) continue;
        const skeleton = new Skeleton(spot, this.rng.int(1, 1e6));
        this.engine.scene.add(skeleton.group);
        this.skeletons.push(skeleton);
      }
      if (this.skeletons.length > 0) this.hud.toast('Bones stir on this island...', 'bad');
    } else if (distance > island.radius + 240 && this.skeletons.length > 0) {
      this.despawnSkeletons();
    }
    void dt;
  }

  private despawnSkeletons(): void {
    for (const skeleton of this.skeletons) skeleton.dispose();
    this.skeletons = [];
  }

  private spawnFleetShip(): void {
    const angle = this.rng.float(0, TAU);
    const distance = this.rng.float(500, 900);
    const x = clamp(this.playerShip.position.x + Math.cos(angle) * distance, -WORLD_EXTENT, WORLD_EXTENT);
    const z = clamp(this.playerShip.position.z + Math.sin(angle) * distance, -WORLD_EXTENT, WORLD_EXTENT);
    const enemy = new SkeletonShip(x, z, this.rng.int(1, 1e6), this.env.uniforms as unknown as Record<string, THREE.IUniform>);
    enemy.ship.onCreak = () => {};
    this.engine.scene.add(enemy.ship.group);
    this.fleet.push(enemy);
    this.ships.push(enemy.ship);
  }

  private updateFleetLifecycle(dt: number): void {
    for (const enemy of this.fleet) {
      if (!enemy.ship.destroyed) continue;
      // Sunk: leave its cargo bobbing on the surface.
      const position = enemy.ship.position.clone();
      position.y = this.ocean.waterHeight(position.x, position.z);
      for (let i = 0; i < 2; i++) {
        const drop = position.clone().add(new THREE.Vector3(this.rng.float(-6, 6), 0, this.rng.float(-6, 6)));
        this.chests.push(new Chest(this.rng.bool(0.4) ? LOOT_TABLE.marauder : LOOT_TABLE.seafarer, drop, this.engine.scene));
      }
      this.hud.toast(`${enemy.ship.name} is sunk - loot floats free!`, 'gold');
      this.audio.bell();
      enemy.dispose();
      this.ships = this.ships.filter((s) => s !== enemy.ship);
    }
    this.fleet = this.fleet.filter((enemy) => !enemy.ship.destroyed);

    this.fleetRespawnTimer -= dt;
    if (this.fleetRespawnTimer <= 0 && this.fleet.length < 2) {
      this.fleetRespawnTimer = this.rng.float(70, 140);
      this.spawnFleetShip();
    }
  }

  private updatePlayerShipLifecycle(dt: number): void {
    if (!this.playerShip.destroyed) {
      if (this.playerShip.sinking && this.shipRespawnTimer === 0) {
        this.hud.toast('She is going down! Abandon ship!', 'bad');
        this.shipRespawnTimer = -1;
      }
      return;
    }
    if (this.shipRespawnTimer <= 0) this.shipRespawnTimer = 6;
    this.shipRespawnTimer -= dt;
    if (this.shipRespawnTimer > 0) return;

    // A new sloop is waiting at the nearest outpost, as tradition demands.
    const outpost = this.nearestOutpost(this.player.worldPos);
    const berth = outpost.mooring;
    const heading = Math.atan2(outpost.dockEnd.z - berth.z, outpost.dockEnd.x - berth.x);
    this.playerShip.respawn(berth.x, berth.z, heading + Math.PI / 2);
    this.player.respawnOn(this.playerShip);
    this.shipRespawnTimer = 0;
    this.hud.toast('The Ferry gave ye another sloop. Try to keep this one afloat.', 'info');
  }

  /** Surfaces the mermaid when the player is stranded in open water. */
  private updateMermaid(dt: number): void {
    const stranded =
      this.player.mode === 'swim' &&
      !this.player.dead &&
      (this.playerShip.destroyed || this.playerShip.distanceTo(this.player.worldPos) > 45);
    this.mermaid.update(dt, stranded, this.player.worldPos, this.ocean);
  }

  private nearestOutpost(position: THREE.Vector3): Outpost {
    let best = this.outposts[0];
    let bestDist = Infinity;
    for (const outpost of this.outposts) {
      const d = Math.hypot(outpost.island.x - position.x, outpost.island.z - position.z);
      if (d < bestDist) {
        bestDist = d;
        best = outpost;
      }
    }
    return best;
  }

  private respawnPlayer(): void {
    if (!this.player.dead) return;
    this.hud.showDeath(false);
    this.state = 'playing';
    if (this.playerShip.destroyed || this.playerShip.sinking) {
      const outpost = this.nearestOutpost(this.player.worldPos);
      this.playerShip.respawn(outpost.mooring.x, outpost.mooring.z, 0);
    }
    this.player.respawnOn(this.playerShip);
    this.carried = null;
    this.input.requestPointerLock();
  }

  private updateAmbience(dt: number): void {
    if (this.player.dead && this.state === 'playing') {
      this.state = 'dead';
      this.hud.showDeath(true, this.player.deathReason);
      this.input.exitPointerLock();
    }

    const nearest = this.islands.nearestIsland(this.player.worldPos.x, this.player.worldPos.z);
    const surf = clamp01(1 - nearest.distance / 140);

    this.audio.updateAmbience({
      windStrength: clamp01(this.env.windSpeed / 1.4),
      shipSpeed: clamp01(this.playerShip.speed / 8),
      rain: this.env.localStorm,
      underwater: this.player.isUnderwater({
        ships: this.ships,
        ocean: this.ocean,
        islands: this.islands,
        env: this.env,
      }),
      nearSurf: surf,
      dt,
    });

    this.seagullTimer -= dt;
    if (this.seagullTimer <= 0) {
      this.seagullTimer = this.rng.float(9, 26);
      if (surf > 0.35 && this.env.nightFactor < 0.4) this.audio.seagull();
    }
  }

  // -------------------------------------------------------------------- HUD

  private updateHud(): void {
    const ship = this.playerShip;
    const player = this.player;

    this.hud.setHealth(player.healthFraction);
    this.hud.setGold(this.gold);
    this.hud.setHotbar(player.slot, {
      planks: player.count('planks'),
      banana: player.count('banana'),
      cannonballs: player.count('cannonballs'),
    });
    this.hud.setCrosshair(player.firstPerson && (this.station === 'cannon' || player.held === 'flintlock'));

    // North is -Z, which is also "up" on the chart, so bearings map with +90.
    const bearingToCompass = (radians: number) => (((radians * 180) / Math.PI + 90) % 360 + 360) % 360;
    this.hud.drawCompass(
      bearingToCompass(ship.heading),
      bearingToCompass(this.env.windAngle + Math.PI),
      player.hurtPulse,
    );

    const relWind = angleDelta(ship.heading, this.env.windAngle);
    const windLabel =
      Math.abs(relWind) < 0.5
        ? 'astern'
        : Math.abs(relWind) > 2.6
          ? 'dead ahead'
          : relWind > 0
            ? 'off the starboard'
            : 'off the port';

    const rows: ReadoutRow[] = [
      { label: 'Speed', value: `${(ship.speed * KNOTS).toFixed(1)} kn` },
      { label: 'Sails', value: `${Math.round(ship.sailAmount * 100)}%` },
      { label: 'Trim', value: `${Math.round(ship.trimQuality(this.env) * 100)}%`, warn: ship.trimQuality(this.env) < 0.6 && ship.sailAmount > 0.1 },
      { label: 'Wind', value: windLabel },
      { label: 'Anchor', value: ship.anchorRaise >= 1 ? 'up' : ship.anchorUp ? 'rising' : 'down', warn: ship.anchorRaise < 1 },
    ];
    if (ship.openHoles > 0) rows.push({ label: 'Breaches', value: String(ship.openHoles), warn: true });
    if (ship.floodLevel > 0.02) {
      rows.push({ label: 'Water', value: `${Math.round(ship.floodLevel * 100)}%`, warn: ship.floodLevel > 0.35 });
    }
    if (this.station !== 'none') rows.push({ label: 'Station', value: this.station });
    this.hud.setShipReadout(`${ship.name} - ${this.env.clockString()}`, rows);

    if (this.voyage) {
      const objectives = [
        { text: `Sail to ${this.voyage.island.name}`, done: this.voyage.recovered > 0 },
        {
          text: `Dig up the cache${this.voyage.sites.length > 1 ? 's' : ''} (${this.voyage.recovered}/${this.voyage.sites.length})`,
          done: this.voyage.complete,
        },
        { text: 'Sell the haul at an outpost', done: this.voyage.complete && this.voyage.sold >= this.voyage.recovered },
      ];
      this.hud.setQuest(this.voyage.title, objectives);
    }
  }
}
